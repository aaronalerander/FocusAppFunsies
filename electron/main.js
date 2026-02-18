import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { createRequire } from 'module'
import { existsSync, readFileSync } from 'fs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ── Database setup ────────────────────────────────────────────

const DB_PATH = join(app.getPath('userData'), 'focus.db')
const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    completedAt TEXT,
    movedToLaterAt TEXT,
    "order" INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

// ── Default settings ──────────────────────────────────────────

const SETTING_DEFAULTS = {
  theme: 'dark',
  soundEnabled: true,
  fontSize: 'medium',
  dailyResetEnabled: false,
  lifetimeCompleted: 0,
  lastResetDate: null,
  progressResetAt: null   // ISO timestamp — completed tasks before this are excluded from today's counter
}

function initSettings() {
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  const insertMany = db.transaction((defaults) => {
    for (const [key, val] of Object.entries(defaults)) {
      insert.run(key, JSON.stringify(val))
    }
  })
  insertMany(SETTING_DEFAULTS)
}

function readSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const settings = {}
  for (const { key, value } of rows) {
    settings[key] = JSON.parse(value)
  }
  return settings
}

function upsertSettings(changes) {
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
  )
  const upsertMany = db.transaction((obj) => {
    for (const [key, val] of Object.entries(obj)) {
      upsert.run(key, JSON.stringify(val))
    }
  })
  upsertMany(changes)
}

// ── One-time migration from electron-store JSON ───────────────

function migrateFromJSON() {
  const jsonPath = join(app.getPath('userData'), 'focus-data.json')
  if (!existsSync(jsonPath)) return

  const taskCount = db.prepare('SELECT COUNT(*) as n FROM tasks').get().n
  const settingCount = db.prepare('SELECT COUNT(*) as n FROM settings').get().n
  if (taskCount > 0 || settingCount > 0) return  // already migrated

  try {
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'))

    const insertTask = db.prepare(`
      INSERT OR IGNORE INTO tasks (id, text, status, createdAt, completedAt, movedToLaterAt, "order")
      VALUES (@id, @text, @status, @createdAt, @completedAt, @movedToLaterAt, @order)
    `)
    const migrateAll = db.transaction((tasks) => {
      for (const t of tasks) insertTask.run(t)
    })
    if (Array.isArray(data.tasks)) migrateAll(data.tasks)

    if (data.settings) upsertSettings(data.settings)
  } catch (err) {
    console.error('Migration from JSON failed:', err)
  }
}

initSettings()
migrateFromJSON()

// ── Window ────────────────────────────────────────────────────

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 800,
    minWidth: 500,
    minHeight: 600,
    resizable: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0F0F0F',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function checkDailyReset() {
  const settings = readSettings()
  const today = new Date().toISOString().split('T')[0]

  // ── Midnight progress reset (always) ──────────────────────────
  // If progressResetAt is from a previous day, advance it to today's midnight
  // so today's completed tasks start counting fresh.
  const resetAt = settings.progressResetAt
  const resetDay = resetAt ? resetAt.split('T')[0] : null
  if (resetDay !== today) {
    // Midnight of today in local time, expressed as ISO string
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    upsertSettings({ progressResetAt: midnight.toISOString() })
  }

  // ── Daily task reset (opt-in) ──────────────────────────────────
  if (!settings.dailyResetEnabled) return
  if (settings.lastResetDate === today) return

  db.prepare(`
    UPDATE tasks SET status = 'later', movedToLaterAt = ? WHERE status = 'today'
  `).run(new Date().toISOString())

  upsertSettings({ lastResetDate: today })
}

app.whenReady().then(() => {
  createWindow()
  checkDailyReset()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC Handlers ──────────────────────────────────────────────

ipcMain.handle('tasks:read', () => {
  return db.prepare('SELECT * FROM tasks ORDER BY "order" ASC').all()
})

ipcMain.handle('tasks:write', (_e, tasks) => {
  const deleteAll = db.prepare('DELETE FROM tasks')
  const insert = db.prepare(`
    INSERT INTO tasks (id, text, status, createdAt, completedAt, movedToLaterAt, "order")
    VALUES (@id, @text, @status, @createdAt, @completedAt, @movedToLaterAt, @order)
  `)
  db.transaction(() => {
    deleteAll.run()
    for (const t of tasks) insert.run(t)
  })()
  return { success: true }
})

ipcMain.handle('task:add', (_e, task) => {
  db.prepare(`
    INSERT INTO tasks (id, text, status, createdAt, completedAt, movedToLaterAt, "order")
    VALUES (@id, @text, @status, @createdAt, @completedAt, @movedToLaterAt, @order)
  `).run(task)
  return { success: true }
})

ipcMain.handle('task:update', (_e, { id, changes }) => {
  const allowed = ['text', 'status', 'completedAt', 'movedToLaterAt', 'order']
  const cols = Object.keys(changes).filter(k => allowed.includes(k))
  if (cols.length === 0) return { success: true }

  const set = cols.map(c => `"${c}" = @${c}`).join(', ')
  db.prepare(`UPDATE tasks SET ${set} WHERE id = @id`).run({ ...changes, id })
  return { success: true }
})

ipcMain.handle('task:delete', (_e, id) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  return { success: true }
})

ipcMain.handle('task:reorder', (_e, orderedIds) => {
  const update = db.prepare('UPDATE tasks SET "order" = ? WHERE id = ?')
  db.transaction(() => {
    orderedIds.forEach((id, i) => update.run(i, id))
  })()
  return { success: true }
})

ipcMain.handle('settings:read', () => readSettings())

ipcMain.handle('settings:write', (_e, settings) => {
  const deleteAll = db.prepare('DELETE FROM settings')
  db.transaction(() => {
    deleteAll.run()
    upsertSettings(settings)
  })()
  return { success: true }
})

ipcMain.handle('settings:update', (_e, changes) => {
  upsertSettings(changes)
  return { success: true }
})

ipcMain.handle('lifetime:increment', () => {
  const current = JSON.parse(
    db.prepare("SELECT value FROM settings WHERE key = 'lifetimeCompleted'").get()?.value ?? '0'
  )
  const next = current + 1
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('lifetimeCompleted', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).run(JSON.stringify(next))
  return next
})

ipcMain.handle('progress:reset', () => {
  const now = new Date().toISOString()
  upsertSettings({ progressResetAt: now })
  return now
})

ipcMain.handle('system:theme', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
})
