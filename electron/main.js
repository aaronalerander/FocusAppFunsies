import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { createRequire } from 'module'
import { existsSync, readFileSync } from 'fs'
import { getRankForXP, calculateDailyPenalty } from '../src/utils/progression.js'
import { getLogicalToday, getResetTimestamp } from '../src/utils/dateUtils.js'

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
    "order" INTEGER NOT NULL DEFAULT 0,
    tag TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

// Add tag column to existing databases that don't have it yet
try {
  db.exec('ALTER TABLE tasks ADD COLUMN tag TEXT')
} catch (_) {
  // Column already exists — safe to ignore
}

// ── Default settings ──────────────────────────────────────────

const SETTING_DEFAULTS = {
  theme: 'dark',
  soundEnabled: true,
  fontSize: 'medium',
  dailyResetEnabled: false,
  lifetimeCompleted: 0,
  lastResetDate: null,
  progressResetAt: null,   // ISO timestamp — completed tasks before this are excluded from today's counter

  // ── Progression / Gamification ───────────────────────────────
  currentXP: 0,
  currentRankId: 'bronze_4',
  streakCount: 0,
  streakLastDate: null,        // ISO date string (YYYY-MM-DD) of last board clear
  boardClearedToday: false,
  tasksCompletedToday: 0,
  freeXPTaskIds: '[]',         // JSON array of task IDs in bonus round
  pendingDerank: null           // { fromRankId, toRankId, xpLost } | null — shown on next launch
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

function getYesterday(todayStr) {
  const d = new Date(todayStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function checkDailyReset() {
  const settings = readSettings()
  const today = getLogicalToday()

  // ── 5 AM EST progress reset (always) ──────────────────────────
  const resetAt = settings.progressResetAt
  const resetDay = resetAt ? resetAt.split('T')[0] : null
  if (resetDay !== today) {
    const resetTime = getResetTimestamp()

    // ── Progression: XP penalty & streak logic ────────────────────
    const boardCleared = settings.boardClearedToday || false
    const todayTaskCount = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status = 'today'").get().n
    const currentXP = settings.currentXP || 0
    const currentRankId = settings.currentRankId || 'bronze_4'
    const streakCount = settings.streakCount || 0
    const streakLastDate = settings.streakLastDate || null
    const yesterday = getYesterday(today)

    const progressionUpdates = {}

    if (!boardCleared && todayTaskCount > 0) {
      // Board was NOT cleared and there are uncompleted today-tasks → penalty
      const penalty = calculateDailyPenalty(todayTaskCount, currentRankId)
      const newXP = Math.max(0, currentXP - penalty)
      const newRank = getRankForXP(newXP)

      progressionUpdates.currentXP = newXP
      progressionUpdates.currentRankId = newRank.id

      if (newRank.id !== currentRankId) {
        progressionUpdates.pendingDerank = { fromRankId: currentRankId, toRankId: newRank.id, xpLost: penalty }
      }
    }

    // Streak: if board was cleared and streakLastDate was yesterday or today, streak holds.
    // If board was NOT cleared on a day with tasks, break streak.
    // Zero-task days are neutral — don't break streak.
    if (!boardCleared && todayTaskCount > 0) {
      progressionUpdates.streakCount = 0
    }
    // (If board was cleared, streak was already updated by progression:boardCleared handler)

    // Free XP carry-over: tasks from bonus round that weren't completed
    // Per PRD: they carry over as normal tasks tomorrow (completing earns XP, not completing incurs penalty)
    // Reorder free XP tasks to top of Today
    const freeXPTaskIds = JSON.parse(settings.freeXPTaskIds || '[]')
    if (boardCleared && freeXPTaskIds.length > 0) {
      const todayTasks = db.prepare("SELECT id FROM tasks WHERE status = 'today' ORDER BY \"order\" ASC").all()
      const freeSet = new Set(freeXPTaskIds)
      const freeTasks = todayTasks.filter(t => freeSet.has(t.id))
      const otherTasks = todayTasks.filter(t => !freeSet.has(t.id))
      const reordered = [...freeTasks, ...otherTasks]
      const updateOrder = db.prepare('UPDATE tasks SET "order" = ? WHERE id = ?')
      db.transaction(() => {
        reordered.forEach((t, i) => updateOrder.run(i, t.id))
      })()
    }

    // Reset daily counters
    progressionUpdates.boardClearedToday = false
    progressionUpdates.tasksCompletedToday = 0
    progressionUpdates.freeXPTaskIds = '[]'

    upsertSettings({ progressResetAt: resetTime, ...progressionUpdates })
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
    INSERT INTO tasks (id, text, status, createdAt, completedAt, movedToLaterAt, "order", tag)
    VALUES (@id, @text, @status, @createdAt, @completedAt, @movedToLaterAt, @order, @tag)
  `).run({ tag: null, ...task })
  return { success: true }
})

ipcMain.handle('task:update', (_e, { id, changes }) => {
  const allowed = ['text', 'status', 'completedAt', 'movedToLaterAt', 'order', 'tag']
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

ipcMain.handle('tags:all', () => {
  const rows = db.prepare("SELECT DISTINCT tag FROM tasks WHERE tag IS NOT NULL AND tag != '' ORDER BY tag ASC").all()
  return rows.map(r => r.tag)
})

// ── Progression IPC Handlers ─────────────────────────────────

ipcMain.handle('progression:read', () => {
  const settings = readSettings()
  return {
    currentXP: settings.currentXP ?? 0,
    currentRankId: settings.currentRankId ?? 'bronze_4',
    streakCount: settings.streakCount ?? 0,
    streakLastDate: settings.streakLastDate ?? null,
    boardClearedToday: settings.boardClearedToday ?? false,
    tasksCompletedToday: settings.tasksCompletedToday ?? 0,
    freeXPTaskIds: JSON.parse(settings.freeXPTaskIds ?? '[]'),
    pendingDerank: settings.pendingDerank ?? null,
  }
})

ipcMain.handle('progression:awardXP', (_e, { xpAmount, tasksCompletedToday }) => {
  const settings = readSettings()
  const oldXP = settings.currentXP ?? 0
  const oldRankId = settings.currentRankId ?? 'bronze_4'
  const newXP = oldXP + xpAmount
  const newRank = getRankForXP(newXP)
  const rankedUp = newRank.id !== oldRankId

  upsertSettings({
    currentXP: newXP,
    currentRankId: newRank.id,
    tasksCompletedToday,
  })

  return { newXP, newRankId: newRank.id, rankedUp, previousRankId: oldRankId }
})

ipcMain.handle('progression:boardCleared', () => {
  const settings = readSettings()
  const today = getLogicalToday()
  const streakLastDate = settings.streakLastDate ?? null
  const oldStreak = settings.streakCount ?? 0
  const yesterday = getYesterday(today)

  // Increment streak if last clear was yesterday or today, otherwise start fresh at 1
  let newStreak
  if (streakLastDate === today) {
    newStreak = oldStreak  // already cleared today, no double count
  } else if (streakLastDate === yesterday) {
    newStreak = oldStreak + 1
  } else {
    newStreak = 1
  }

  const updates = {
    boardClearedToday: true,
    streakCount: newStreak,
    streakLastDate: today,
  }
  upsertSettings(updates)

  return {
    boardClearedToday: true,
    streakCount: newStreak,
    streakLastDate: today,
  }
})

ipcMain.handle('progression:addFreeXPTask', (_e, taskId) => {
  const settings = readSettings()
  const ids = JSON.parse(settings.freeXPTaskIds ?? '[]')
  if (!ids.includes(taskId)) ids.push(taskId)
  upsertSettings({ freeXPTaskIds: JSON.stringify(ids) })
  return ids
})

ipcMain.handle('progression:removeFreeXPTask', (_e, taskId) => {
  const settings = readSettings()
  const ids = JSON.parse(settings.freeXPTaskIds ?? '[]').filter(id => id !== taskId)
  upsertSettings({ freeXPTaskIds: JSON.stringify(ids) })
  return ids
})

ipcMain.handle('progression:reset', () => {
  upsertSettings({
    currentXP: 0,
    currentRankId: 'bronze_4',
    streakCount: 0,
    streakLastDate: null,
    boardClearedToday: false,
    tasksCompletedToday: 0,
    freeXPTaskIds: '[]',
    pendingDerank: null,
  })
  return { success: true }
})

ipcMain.handle('progression:clearDerank', () => {
  upsertSettings({ pendingDerank: null })
  return { success: true }
})

ipcMain.handle('hardReset', () => {
  db.prepare('DELETE FROM tasks').run()
  db.prepare('DELETE FROM settings').run()
  initSettings()
  return { success: true }
})
