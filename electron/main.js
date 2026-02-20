import { app, BrowserWindow, ipcMain, nativeTheme, globalShortcut, Notification } from 'electron'
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
import { createQuickEntryWindow, toggleQuickEntry, hideQuickEntry, destroyQuickEntry, setMainWindow } from './quickEntry.js'

// Suppress EPIPE errors from Electron's internal IPC pipe to hidden renderer processes.
// These are harmless — they occur when a renderer's stdin pipe closes before a write completes.
process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE') return
  throw err
})

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const crypto = require('crypto')

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

// Small XP awarded when a task is created — deducted on delete at any time
try { db.exec('ALTER TABLE tasks ADD COLUMN creation_xp_awarded INTEGER DEFAULT 0') } catch (_) {}

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

  // ── Notifications ────────────────────────────────────────────
  notificationsEnabled: true,  // boolean: send bleed-phase urgency notifications

  // ── Bleed system ─────────────────────────────────────────────
  daily_bleed_total: 0,        // float: total XP bled today; resets at daily reset
  bleed_xp_fraction: 0,        // float: sub-1 fractional XP carry-over between ticks
  bleed_cap_hit_today: false,  // boolean: daily cap has been reached
  bleed_active: true,          // boolean: false once board is cleared or cap is hit
  last_bleed_applied_at: null, // ISO timestamp: when the last bleed tick was applied

  // ── Daily Board Modifier ──────────────────────────────────────
  // Hidden loot probability seed for the day. Never exposed to the player.
  // Seeded once at daily reset. 'standard' | 'warm' | 'hot'
  daily_modifier_type: 'standard',
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
  // Prevent multiple main windows — focus existing one instead
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return
  }

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
    setMainWindow(null)
  })

  setMainWindow(mainWindow)
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

    // Seed hidden daily modifier. Player never sees this.
    // 60% standard / 30% warm / 10% hot
    const modifierRoll = Math.random()
    progressionUpdates.daily_modifier_type = modifierRoll < 0.6 ? 'standard' : modifierRoll < 0.9 ? 'warm' : 'hot'

    upsertSettings({ progressResetAt: resetTime, ...progressionUpdates })

    // ── Auto-pull from Later to fill Today slots at reset ─────────
    const currentRankId = settings.currentRankId ?? 'bronze_4'
    const rank = getRankById(currentRankId)
    const maxSlots = rank.taskSlots
    const todayCountNow = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status = 'today'").get().n
    const available = maxSlots - todayCountNow
    if (available > 0) {
      const laterTasks = db.prepare(
        "SELECT id, \"order\" FROM tasks WHERE status = 'later' ORDER BY \"order\" ASC LIMIT ?"
      ).all(available)
      if (laterTasks.length > 0) {
        const updateTask = db.prepare("UPDATE tasks SET status = 'today', movedToLaterAt = NULL WHERE id = ?")
        const updateOrder = db.prepare("UPDATE tasks SET \"order\" = ? WHERE id = ?")
        db.transaction(() => {
          laterTasks.forEach((t, i) => {
            updateTask.run(t.id)
            updateOrder.run(todayCountNow + i, t.id)
          })
        })()
      }
    }
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

  // Seed last_bleed_applied_at if it has never been set (new install or
  // pre-bleed install). Without this the null guard in applyBleedTick()
  // prevents the engine from ever firing.
  const bootstrapSettings = readSettings()
  if (!bootstrapSettings.last_bleed_applied_at) {
    upsertSettings({ last_bleed_applied_at: new Date().toISOString() })
  }

  bleedIntervalId = setInterval(() => {
    const result = applyBleedTick()
    if (result && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bleed-tick', result)
    }
  }, 60 * 1000)
}

// ── Bleed Notifications ───────────────────────────────────────
//
// Three triggers, max 2 per day, keyed to the bleed phase transitions.
// All fire within the work day window — nothing after ~10 PM (17h post-reset).
//
// With the default 5 AM reset:
//   Phase 2 entry  (6h after reset  = ~11 AM) — rate tripled, mild nudge
//   Phase 3 entry  (12h after reset = ~5 PM)  — rate at 8×, urgent
//   Final warning  (16h after reset = ~9 PM)  — last call before it's too late
//
// Each trigger fires once per day at most. State is tracked with today's
// reset timestamp so it resets automatically when the day rolls over.
//
// Copy principles (Clark et al. 2009 / Kahneman prospect theory):
//   – Lead with endowed progress (streak, total XP) before naming the loss
//   – Name the specific XP amount at risk — vague threats are ignored
//   – Escalate tone across the three stages: informational → tense → terse
//   – No guilt-tripping, no mascots — this app's voice is competitive/RPG

const NOTIF_SENT_KEY = 'notif_sent_today'  // DB key tracking which were sent this reset

function getNotifSentToday(settings) {
  // notif_sent_today is a JSON object: { phase2: bool, phase3: bool, final: bool, resetAt: string }
  try {
    const raw = settings[NOTIF_SENT_KEY]
    if (!raw) return {}
    const val = typeof raw === 'string' ? JSON.parse(raw) : raw
    // If it's from a previous reset cycle, ignore it
    if (val.resetAt !== settings.progressResetAt) return {}
    return val
  } catch { return {} }
}

function markNotifSent(key, settings) {
  const current = getNotifSentToday(settings)
  upsertSettings({
    [NOTIF_SENT_KEY]: JSON.stringify({
      ...current,
      [key]: true,
      resetAt: settings.progressResetAt,
    })
  })
}

function getRemainingTaskCount() {
  return db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status = 'today'").get().n
}

function sendBleedNotification(title, body) {
  if (!Notification.isSupported()) return
  const notif = new Notification({ title, body, silent: false })
  notif.show()
}

function getNotifCopy(stage, settings) {
  const streak = settings.streakCount ?? 0
  const dailyBleed = settings.daily_bleed_total ?? 0
  const remaining = getRemainingTaskCount()
  const rank = getRankById(settings.currentRankId ?? 'bronze_4')
  const cap = rank.penaltyCap
  const xpStillAtRisk = cap - dailyBleed  // XP left to lose today

  const taskWord = remaining === 1 ? 'task' : 'tasks'
  const streakStr = streak > 0 ? `${streak}-day streak. ` : ''

  // Pick a random variant each time — Duolingo's bandit research shows
  // repeated identical copy is the fastest path to banner blindness.
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

  if (stage === 'phase2') {
    // Tone: informational / mild urgency — rate just tripled.
    // Lead with endowed progress, then name the acceleration.
    return pick([
      {
        title: 'XP drain accelerating',
        body: `${streakStr}${remaining} ${taskWord} left. The bleed rate just tripled — finish before it gets worse.`,
      },
      {
        title: 'The drain just sped up',
        body: `${remaining} ${taskWord} unfinished. You're now losing XP 3× faster. Don't let it compound.`,
      },
      {
        title: 'Bleed rate: ×3',
        body: `${streakStr}XP is leaving faster now. ${remaining} ${taskWord} to stop the clock.`,
      },
      {
        title: 'Halfway through the day',
        body: `${remaining} ${taskWord} still waiting. The drain rate just shifted — now's the time to move.`,
      },
    ])
  }

  if (stage === 'phase3') {
    // Tone: direct loss frame — 8× rate, specific stake named.
    return pick([
      {
        title: `${xpStillAtRisk} XP at risk`,
        body: `${remaining} ${taskWord} standing between you and a clean day. Drain rate is at maximum. Finish before reset.`,
      },
      {
        title: 'Maximum bleed',
        body: `You could still lose ${xpStillAtRisk} XP tonight. ${remaining} ${taskWord} left. The rate won't get worse — but it won't stop either.`,
      },
      {
        title: `${remaining} ${taskWord}. ${xpStillAtRisk} XP draining.`,
        body: `Drain is running at 8× now. ${streakStr}Finish today and it all stops.`,
      },
      {
        title: 'The bleed is maxed out',
        body: `${xpStillAtRisk} XP on the line. ${remaining} ${taskWord} to close it out before reset.`,
      },
    ])
  }

  if (stage === 'final') {
    // Tone: terse — one action, evening deadline, no fluff.
    // Fires ~9 PM with default reset. "Tonight" is the operative word.
    return pick([
      {
        title: 'Last call tonight',
        body: `${remaining} ${taskWord}. ${xpStillAtRisk} XP still draining. Finish before you call it a day.`,
      },
      {
        title: `End the day clean`,
        body: `${remaining} ${taskWord} left. ${xpStillAtRisk} XP at stake. Don't carry this into tomorrow.`,
      },
      {
        title: `${xpStillAtRisk} XP on the line`,
        body: `${remaining} ${taskWord} to go. Tonight's your last real shot before the drain runs all night.`,
      },
      {
        title: 'Finish strong',
        body: `${streakStr}${remaining} ${taskWord} unfinished. ${xpStillAtRisk} XP still at risk — close it out tonight.`,
      },
    ])
  }

  return null
}

let notifCheckIntervalId = null

function startNotificationScheduler() {
  if (notifCheckIntervalId) clearInterval(notifCheckIntervalId)
  // Check every minute — same cadence as bleed ticks, negligible overhead
  notifCheckIntervalId = setInterval(() => {
    checkAndSendBleedNotifications()
  }, 60 * 1000)
}

function checkAndSendBleedNotifications() {
  const settings = readSettings()

  // Hard guards — never fire if board is cleared, bleed stopped, or user opted out
  if (!settings.notificationsEnabled) return
  if (settings.boardClearedToday) return
  if (settings.bleed_cap_hit_today) return
  if (!settings.progressResetAt) return

  const remaining = getRemainingTaskCount()
  if (remaining === 0) return  // all done, nothing to warn about

  const sent = getNotifSentToday(settings)
  const resetHour = settings.dailyResetHourUTC ?? 10
  const nowMs = Date.now()
  const { phase } = getBleedPhase(nowMs, resetHour)

  // ── Phase 2 notification (bleed rate tripled) ──────────────
  if (phase >= 2 && !sent.phase2) {
    const copy = getNotifCopy('phase2', settings)
    if (copy) sendBleedNotification(copy.title, copy.body)
    markNotifSent('phase2', readSettings())  // re-read to get fresh resetAt
    return  // only one notif per minute
  }

  // ── Phase 3 notification (bleed rate 8×) ───────────────────
  if (phase >= 3 && !sent.phase3) {
    const copy = getNotifCopy('phase3', settings)
    if (copy) sendBleedNotification(copy.title, copy.body)
    markNotifSent('phase3', readSettings())
    return
  }

  // ── Final warning (16h after reset ≈ 9 PM with default 5 AM reset) ───
  // Fires well within the evening crunch window, not in the middle of the night.
  // Minimum 4h gap from phase 3 notification (12h) ensures no back-to-back.
  const resetMs = (() => {
    const now = new Date(nowMs)
    const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes()
    const resetMins = resetHour * 60
    const ms = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
      resetHour, 0, 0, 0
    ))
    if (utcMins < resetMins) ms.setUTCDate(ms.getUTCDate() - 1)
    return ms.getTime()
  })()
  const elapsedHours = (nowMs - resetMs) / (1000 * 60 * 60)

  if (elapsedHours >= 16 && !sent.final) {
    const copy = getNotifCopy('final', settings)
    if (copy) sendBleedNotification(copy.title, copy.body)
    markNotifSent('final', readSettings())
  }
}

app.whenReady().then(() => {
  createWindow()
  checkDailyReset()
  scheduleDailyResetTimer()
  startBleedInterval()
  startNotificationScheduler()

  // Quick-entry global shortcut (Option+Space)
  createQuickEntryWindow()
  globalShortcut.register('Alt+Space', toggleQuickEntry)

  app.on('activate', () => {
    // Re-create the main window if it was closed (the quick-entry window
    // is always alive but hidden, so we check mainWindow directly)
    if (!mainWindow || mainWindow.isDestroyed()) createWindow()
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
  // On macOS, keep the app running (standard behavior) — the tray icon
  // and quick-entry window persist. On other platforms, quit.
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  destroyQuickEntry()
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
    INSERT INTO tasks (id, text, status, createdAt, completedAt, movedToLaterAt, "order", tag, creation_xp_awarded)
    VALUES (@id, @text, @status, @createdAt, @completedAt, @movedToLaterAt, @order, @tag, @creation_xp_awarded)
  `).run({ tag: null, creation_xp_awarded: 0, ...task })
  return { success: true }
})

ipcMain.handle('task:update', (_e, { id, changes }) => {
  const allowed = ['text', 'status', 'completedAt', 'movedToLaterAt', 'order', 'tag',
    'hidden_multiplier_tier', 'hidden_multiplier_value', 'final_xp_awarded', 'creation_xp_awarded']
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
    dailyModifierType: settings.daily_modifier_type ?? 'standard',
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

// Small XP for task creation — no slot/animation, but rank-up is possible.
// Returns same shape as awardXP so the store can handle rank-ups identically.
ipcMain.handle('progression:awardCreationXP', (_e, { xpAmount }) => {
  const settings = readSettings()
  const oldXP = settings.currentXP ?? 0
  const oldRankId = settings.currentRankId ?? 'bronze_4'
  const newXP = oldXP + xpAmount
  const newRank = getRankForXP(newXP)
  const rankedUp = newRank.id !== oldRankId

  upsertSettings({
    currentXP: newXP,
    currentRankId: newRank.id,
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
  // Restart bleed + notification intervals with a clean slate
  startBleedInterval()
  startNotificationScheduler()
  return { success: true }
})

// ── Quick Entry IPC Handlers ─────────────────────────────────

ipcMain.handle('quick-entry:addTask', (_e, { text, tag }) => {
  if (!text || !text.trim()) return { success: false }

  const tasks = db.prepare('SELECT * FROM tasks ORDER BY "order" ASC').all()
  const laterCount = tasks.filter(t => t.status === 'later').length
  const todayCount = tasks.filter(t => t.status === 'today').length
  const targetStatus = (laterCount === 0 && todayCount === 0) ? 'today' : 'later'
  const statusCount = tasks.filter(t => t.status === targetStatus).length

  const task = {
    id: crypto.randomUUID(),
    text: text.trim(),
    status: targetStatus,
    createdAt: new Date().toISOString(),
    completedAt: null,
    movedToLaterAt: null,
    order: statusCount,
    tag: tag && tag.trim() ? tag.trim() : null,
  }

  db.prepare(`
    INSERT INTO tasks (id, text, status, createdAt, completedAt, movedToLaterAt, "order", tag)
    VALUES (@id, @text, @status, @createdAt, @completedAt, @movedToLaterAt, @order, @tag)
  `).run(task)

  // Notify main window to sync the new task
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('task-added-externally', task)
  }

  return { success: true, task }
})

ipcMain.on('quick-entry:hide', () => {
  hideQuickEntry()
})

ipcMain.handle('quick-entry:stats', () => {
  const settings = readSettings()
  const resetHour = settings.dailyResetHourUTC ?? 10
  const resetBoundary = getResetTimestamp(resetHour)

  // Count today tasks + tasks completed after today's reset
  const allTasks = db.prepare('SELECT * FROM tasks ORDER BY "order" ASC').all()
  const todayTasks = allTasks.filter(t => {
    if (t.status === 'today') return true
    if (t.status === 'done' && t.completedAt && t.completedAt > resetBoundary) return true
    return false
  })
  const completed = todayTasks.filter(t => t.status === 'done').length
  const total = todayTasks.length

  const currentRankId = settings.currentRankId ?? 'bronze_4'
  const rank = getRankById(currentRankId)

  const dailyXPEarned = todayTasks
    .filter(t => t.status === 'done')
    .reduce((sum, t) => sum + (t.final_xp_awarded || 0), 0)
  const bleedLost = settings.daily_bleed_total ?? 0
  const xpDelta = dailyXPEarned - bleedLost

  return {
    completed,
    total,
    rankName: rank.name,
    rankTier: rank.tier,
    xpDelta,
  }
})
