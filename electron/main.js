import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { createRequire } from 'module'
import { existsSync, readFileSync } from 'fs'
import {
  getRankForXP,
  getRankById,
  getBleedPhase,
  calculateBleedTick,
  calculateCatchUpBleed,
} from '../src/utils/progression.js'
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

// Add hidden multiplier columns for loot pull feature
try { db.exec('ALTER TABLE tasks ADD COLUMN hidden_multiplier_tier TEXT') } catch (_) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN hidden_multiplier_value REAL') } catch (_) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN final_xp_awarded INTEGER') } catch (_) {}

// ── Default settings ──────────────────────────────────────────

const SETTING_DEFAULTS = {
  theme: 'dark',
  soundEnabled: true,
  fontSize: 'medium',
  dailyResetEnabled: false,
  lifetimeCompleted: 0,
  lastResetDate: null,
  progressResetAt: null,   // ISO timestamp — completed tasks before this are excluded from today's counter
  dailyResetHourUTC: 10,   // UTC hour (0-23) for daily board reset. Default 10 = 5:00 AM EST

  // ── Progression / Gamification ───────────────────────────────
  currentXP: 0,
  currentRankId: 'bronze_4',
  streakCount: 0,
  streakLastDate: null,        // ISO date string (YYYY-MM-DD) of last board clear
  boardClearedToday: false,
  tasksCompletedToday: 0,
  freeXPTaskIds: '[]',         // JSON array of task IDs in bonus round
  pendingDerank: null,          // { fromRankId, toRankId, xpLost } | null — shown on next launch

  // ── Bleed system ─────────────────────────────────────────────
  daily_bleed_total: 0,        // float: total XP bled today; resets at daily reset
  bleed_xp_fraction: 0,        // float: sub-1 fractional XP carry-over between ticks
  bleed_cap_hit_today: false,  // boolean: daily cap has been reached
  bleed_active: true,          // boolean: false once board is cleared or cap is hit
  last_bleed_applied_at: null, // ISO timestamp: when the last bleed tick was applied
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
  const resetHour = settings.dailyResetHourUTC ?? 10
  const today = getLogicalToday(resetHour)
  const resetTime = getResetTimestamp(resetHour)

  // ── 5 AM EST progress reset (always) ──────────────────────────
  // Compare against the exact reset timestamp, not just the date portion,
  // so stale values from the old midnight-based reset are detected correctly.
  const resetAt = settings.progressResetAt
  let didReset = false
  if (resetAt !== resetTime) {
    didReset = true

    // ── Progression: streak & bleed reset logic ──────────────────
    const boardCleared = settings.boardClearedToday || false
    const todayTaskCount = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status = 'today'").get().n

    const progressionUpdates = {}

    // Bleed replaces the end-of-day cliff penalty — no lump-sum deduction at reset.
    // Streak: zero-task days are neutral. Board-cleared days already updated streak via
    // the progression:boardCleared handler. If board was NOT cleared on a task day, break streak.
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

    // Reset bleed state for the new day — bleed starts fresh from the reset boundary
    progressionUpdates.daily_bleed_total = 0
    progressionUpdates.bleed_xp_fraction = 0
    progressionUpdates.bleed_cap_hit_today = false
    progressionUpdates.bleed_active = true
    progressionUpdates.last_bleed_applied_at = resetTime

    upsertSettings({ progressResetAt: resetTime, ...progressionUpdates })
  }

  // Notify renderer to reload state after a daily reset
  if (didReset && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('daily-reset')
  }

  // ── Daily task reset (opt-in) ──────────────────────────────────
  if (!settings.dailyResetEnabled) return
  if (settings.lastResetDate === today) return

  db.prepare(`
    UPDATE tasks SET status = 'later', movedToLaterAt = ? WHERE status = 'today'
  `).run(new Date().toISOString())

  upsertSettings({ lastResetDate: today })
}

/**
 * Schedule a timer to fire at the next daily reset boundary,
 * so the reset happens even if the app stays open overnight.
 */
let resetTimerId = null
function scheduleDailyResetTimer() {
  if (resetTimerId) clearTimeout(resetTimerId)

  const settings = readSettings()
  const resetHour = settings.dailyResetHourUTC ?? 10

  const now = new Date()
  const utcTotalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const resetMinutesUTC = resetHour * 60

  let msUntilReset
  if (utcTotalMinutes < resetMinutesUTC) {
    msUntilReset = (resetMinutesUTC - utcTotalMinutes) * 60 * 1000
  } else {
    msUntilReset = ((24 * 60 - utcTotalMinutes) + resetMinutesUTC) * 60 * 1000
  }

  // Add a small buffer (5 seconds) to ensure we're past the boundary
  msUntilReset += 5000

  resetTimerId = setTimeout(() => {
    checkDailyReset()
    scheduleDailyResetTimer()
  }, msUntilReset)
}

// ── Bleed Engine ──────────────────────────────────────────────

/**
 * Count Today tasks eligible for bleed contribution.
 * Excludes freeXPTaskIds (bonus round tasks) — they never bleed per PRD.
 * Later tasks are naturally excluded because they have status='later'.
 */
function getBleedEligibleTaskCount(settings) {
  const todayTasks = db.prepare("SELECT id FROM tasks WHERE status = 'today'").all()
  const freeXPIds = new Set(JSON.parse(settings.freeXPTaskIds ?? '[]'))
  return todayTasks.filter(t => !freeXPIds.has(t.id)).length
}

/**
 * Apply one minute of XP bleed.
 * Returns a payload to push to the renderer, or null if nothing changed.
 */
function applyBleedTick() {
  const settings = readSettings()

  if (settings.boardClearedToday) return null
  if (settings.bleed_cap_hit_today) return null
  if (!settings.last_bleed_applied_at) return null

  const eligibleCount = getBleedEligibleTaskCount(settings)
  if (eligibleCount <= 0) return null

  const resetHour = settings.dailyResetHourUTC ?? 10
  const nowMs = Date.now()
  const { multiplier } = getBleedPhase(nowMs, resetHour)

  const currentFraction = settings.bleed_xp_fraction ?? 0
  const newFraction = currentFraction + calculateBleedTick(eligibleCount, multiplier)
  const wholeXP = Math.floor(newFraction)
  const remainderFraction = newFraction - wholeXP

  if (wholeXP === 0) {
    // Only fraction changed — update silently without pushing to renderer
    upsertSettings({
      bleed_xp_fraction: remainderFraction,
      last_bleed_applied_at: new Date(nowMs).toISOString(),
    })
    return null
  }

  // Enforce daily cap
  const dailyBleedSoFar = settings.daily_bleed_total ?? 0
  const currentRankId = settings.currentRankId ?? 'bronze_4'
  const rank = getRankById(currentRankId)
  const cap = rank.penaltyCap
  const remainingCapacity = cap - dailyBleedSoFar
  const actualXP = Math.min(wholeXP, remainingCapacity)
  const capHit = dailyBleedSoFar + actualXP >= cap

  const oldXP = settings.currentXP ?? 0
  const oldRankId = currentRankId
  const newXP = Math.max(0, oldXP - actualXP)
  const newRank = getRankForXP(newXP)
  const newDailyBleed = dailyBleedSoFar + actualXP

  upsertSettings({
    currentXP: newXP,
    currentRankId: newRank.id,
    daily_bleed_total: newDailyBleed,
    bleed_xp_fraction: capHit ? 0 : remainderFraction,
    bleed_cap_hit_today: capHit,
    bleed_active: !capHit,
    last_bleed_applied_at: new Date(nowMs).toISOString(),
  })

  return {
    newXP,
    newRankId: newRank.id,
    deranked: newRank.id !== oldRankId,
    previousRankId: oldRankId,
    capHit,
    dailyBleedTotal: newDailyBleed,
    bleedActive: !capHit,
  }
}

/**
 * Compute and apply all bleed ticks missed while the app was backgrounded or quit.
 * Called on app.on('activate') after checkDailyReset().
 */
function applyCatchUpBleed() {
  const settings = readSettings()

  if (settings.boardClearedToday) return null
  if (settings.bleed_cap_hit_today) return null
  if (!settings.last_bleed_applied_at) return null

  const eligibleCount = getBleedEligibleTaskCount(settings)
  if (eligibleCount <= 0) return null

  const lastApplied = new Date(settings.last_bleed_applied_at).getTime()
  const nowMs = Date.now()
  const minutesElapsed = Math.floor((nowMs - lastApplied) / (60 * 1000))

  if (minutesElapsed < 1) return null

  const resetHour = settings.dailyResetHourUTC ?? 10
  const currentRankId = settings.currentRankId ?? 'bronze_4'
  const rank = getRankById(currentRankId)
  const dailyBleedSoFar = settings.daily_bleed_total ?? 0

  const { totalXP, newDailyBleedTotal, capHit } = calculateCatchUpBleed(
    minutesElapsed,
    lastApplied + 60 * 1000,  // first missed tick starts 1 minute after last applied
    resetHour,
    eligibleCount,
    dailyBleedSoFar,
    rank.penaltyCap
  )

  // Always update the timestamp, even if no whole XP changed
  if (totalXP === 0) {
    upsertSettings({ last_bleed_applied_at: new Date(nowMs).toISOString() })
    return null
  }

  const oldXP = settings.currentXP ?? 0
  const oldRankId = currentRankId
  const newXP = Math.max(0, oldXP - totalXP)
  const newRank = getRankForXP(newXP)

  upsertSettings({
    currentXP: newXP,
    currentRankId: newRank.id,
    daily_bleed_total: newDailyBleedTotal,
    bleed_xp_fraction: 0,  // fraction is discarded in catch-up; whole XP only
    bleed_cap_hit_today: capHit,
    bleed_active: !capHit,
    last_bleed_applied_at: new Date(nowMs).toISOString(),
  })

  return {
    newXP,
    newRankId: newRank.id,
    deranked: newRank.id !== oldRankId,
    previousRankId: oldRankId,
    capHit,
    dailyBleedTotal: newDailyBleedTotal,
    bleedActive: !capHit,
  }
}

let bleedIntervalId = null

function startBleedInterval() {
  if (bleedIntervalId) clearInterval(bleedIntervalId)
  bleedIntervalId = setInterval(() => {
    const result = applyBleedTick()
    if (result && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bleed-tick', result)
    }
  }, 60 * 1000)
}

app.whenReady().then(() => {
  createWindow()
  checkDailyReset()
  scheduleDailyResetTimer()
  startBleedInterval()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    // Re-check reset when app is re-activated (e.g. after sleeping overnight)
    checkDailyReset()
    // Apply any bleed that accumulated while backgrounded or during system sleep
    const catchUpResult = applyCatchUpBleed()
    if (catchUpResult && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bleed-tick', catchUpResult)
    }
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
  const allowed = ['text', 'status', 'completedAt', 'movedToLaterAt', 'order', 'tag',
    'hidden_multiplier_tier', 'hidden_multiplier_value', 'final_xp_awarded']
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
  // Reschedule the daily reset timer if the reset hour changed
  if ('dailyResetHourUTC' in changes) {
    scheduleDailyResetTimer()
  }
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
  const boardCleared = settings.boardClearedToday ?? false
  const capHit = settings.bleed_cap_hit_today ?? false
  return {
    currentXP: settings.currentXP ?? 0,
    currentRankId: settings.currentRankId ?? 'bronze_4',
    streakCount: settings.streakCount ?? 0,
    streakLastDate: settings.streakLastDate ?? null,
    boardClearedToday: boardCleared,
    tasksCompletedToday: settings.tasksCompletedToday ?? 0,
    freeXPTaskIds: JSON.parse(settings.freeXPTaskIds ?? '[]'),
    pendingDerank: settings.pendingDerank ?? null,
    dailyBleedTotal: settings.daily_bleed_total ?? 0,
    bleedCapHitToday: capHit,
    bleedActive: !boardCleared && !capHit,
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
  const resetHour = settings.dailyResetHourUTC ?? 10
  const today = getLogicalToday(resetHour)
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
    bleed_active: false,  // board cleared — bleed stops immediately
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
    daily_bleed_total: 0,
    bleed_xp_fraction: 0,
    bleed_cap_hit_today: false,
    bleed_active: true,
    last_bleed_applied_at: null,
  })
  return { success: true }
})

ipcMain.handle('progression:clearDerank', () => {
  upsertSettings({ pendingDerank: null })
  return { success: true }
})

ipcMain.handle('progression:deductXP', (_e, { xpAmount }) => {
  const settings = readSettings()
  const oldXP = settings.currentXP ?? 0
  const oldRankId = settings.currentRankId ?? 'bronze_4'
  const newXP = Math.max(0, oldXP - xpAmount)
  const newRank = getRankForXP(newXP)

  upsertSettings({
    currentXP: newXP,
    currentRankId: newRank.id,
  })

  return { newXP, newRankId: newRank.id, deranked: newRank.id !== oldRankId, previousRankId: oldRankId }
})

ipcMain.handle('hardReset', () => {
  db.prepare('DELETE FROM tasks').run()
  db.prepare('DELETE FROM settings').run()
  initSettings()
  // Restart bleed interval with a clean slate
  startBleedInterval()
  return { success: true }
})
