// ── Rank Definitions ────────────────────────────────────────────────
// Mirrors Apex Legends rank structure with 22 stages.
// xpRequired = cumulative XP to reach this rank.
// xpToNext = XP needed to advance from this rank to the next.
// taskSlots = max Today tasks at this rank.
// penaltyCap = max XP loss per daily reset (from PRD tier caps).

export const RANKS = [
  // Bronze — penaltyCap: 100
  { id: 'bronze_4', name: 'Bronze IV',    tier: 'bronze',   division: 4, xpRequired: 0,       xpToNext: 500,     taskSlots: 3,  penaltyCap: 100 },
  { id: 'bronze_3', name: 'Bronze III',   tier: 'bronze',   division: 3, xpRequired: 500,     xpToNext: 800,     taskSlots: 4,  penaltyCap: 100 },
  { id: 'bronze_2', name: 'Bronze II',    tier: 'bronze',   division: 2, xpRequired: 1300,    xpToNext: 1100,    taskSlots: 5,  penaltyCap: 100 },
  { id: 'bronze_1', name: 'Bronze I',     tier: 'bronze',   division: 1, xpRequired: 2400,    xpToNext: 1500,    taskSlots: 6,  penaltyCap: 100 },

  // Silver — penaltyCap: 150
  { id: 'silver_4', name: 'Silver IV',    tier: 'silver',   division: 4, xpRequired: 3900,    xpToNext: 3000,    taskSlots: 7,  penaltyCap: 150 },
  { id: 'silver_3', name: 'Silver III',   tier: 'silver',   division: 3, xpRequired: 6900,    xpToNext: 3500,    taskSlots: 7,  penaltyCap: 150 },
  { id: 'silver_2', name: 'Silver II',    tier: 'silver',   division: 2, xpRequired: 10400,   xpToNext: 4500,    taskSlots: 8,  penaltyCap: 150 },
  { id: 'silver_1', name: 'Silver I',     tier: 'silver',   division: 1, xpRequired: 14900,   xpToNext: 5500,    taskSlots: 8,  penaltyCap: 150 },

  // Gold — penaltyCap: 200
  { id: 'gold_4',   name: 'Gold IV',      tier: 'gold',     division: 4, xpRequired: 20400,   xpToNext: 7500,    taskSlots: 9,  penaltyCap: 200 },
  { id: 'gold_3',   name: 'Gold III',     tier: 'gold',     division: 3, xpRequired: 27900,   xpToNext: 9000,    taskSlots: 9,  penaltyCap: 200 },
  { id: 'gold_2',   name: 'Gold II',      tier: 'gold',     division: 2, xpRequired: 36900,   xpToNext: 11000,   taskSlots: 9,  penaltyCap: 200 },
  { id: 'gold_1',   name: 'Gold I',       tier: 'gold',     division: 1, xpRequired: 47900,   xpToNext: 13500,   taskSlots: 10, penaltyCap: 200 },

  // Platinum — penaltyCap: 250
  { id: 'plat_4',   name: 'Platinum IV',  tier: 'platinum', division: 4, xpRequired: 61400,   xpToNext: 25000,   taskSlots: 12, penaltyCap: 250 },
  { id: 'plat_3',   name: 'Platinum III', tier: 'platinum', division: 3, xpRequired: 86400,   xpToNext: 30000,   taskSlots: 12, penaltyCap: 250 },
  { id: 'plat_2',   name: 'Platinum II',  tier: 'platinum', division: 2, xpRequired: 116400,  xpToNext: 37000,   taskSlots: 12, penaltyCap: 250 },
  { id: 'plat_1',   name: 'Platinum I',   tier: 'platinum', division: 1, xpRequired: 153400,  xpToNext: 45000,   taskSlots: 14, penaltyCap: 250 },

  // Diamond — penaltyCap: 300
  { id: 'diamond_4', name: 'Diamond IV',  tier: 'diamond',  division: 4, xpRequired: 198400,  xpToNext: 55000,   taskSlots: 17, penaltyCap: 300 },
  { id: 'diamond_3', name: 'Diamond III', tier: 'diamond',  division: 3, xpRequired: 253400,  xpToNext: 70000,   taskSlots: 17, penaltyCap: 300 },
  { id: 'diamond_2', name: 'Diamond II',  tier: 'diamond',  division: 2, xpRequired: 323400,  xpToNext: 90000,   taskSlots: 17, penaltyCap: 300 },
  { id: 'diamond_1', name: 'Diamond I',   tier: 'diamond',  division: 1, xpRequired: 413400,  xpToNext: 120000,  taskSlots: 20, penaltyCap: 300 },

  // Master — penaltyCap: 350
  { id: 'master',    name: 'Master',      tier: 'master',   division: 0, xpRequired: 533400,  xpToNext: 300000,  taskSlots: 20, penaltyCap: 350 },

  // Predator — penaltyCap: 400
  { id: 'predator',  name: 'Predator',    tier: 'predator', division: 0, xpRequired: 833400,  xpToNext: null,    taskSlots: 20, penaltyCap: 400 },
]

// ── Streak Multipliers ──────────────────────────────────────────────
// Ordered descending so we can find the first threshold <= streakCount.

export const STREAK_THRESHOLDS = [
  { days: 14, multiplier: 2.0 },
  { days: 10, multiplier: 1.75 },
  { days: 7,  multiplier: 1.5 },
  { days: 5,  multiplier: 1.3 },
  { days: 3,  multiplier: 1.2 },
  { days: 2,  multiplier: 1.1 },
  { days: 1,  multiplier: 1.0 },
]

// ── Tier Colors ─────────────────────────────────────────────────────

export const RANK_COLORS = {
  bronze:   { primary: '#CD7F32', bg: 'rgba(205,127,50,0.15)' },
  silver:   { primary: '#C0C0C0', bg: 'rgba(192,192,192,0.15)' },
  gold:     { primary: '#FFD700', bg: 'rgba(255,215,0,0.15)' },
  platinum: { primary: '#44BBCC', bg: 'rgba(68,187,204,0.15)' },
  diamond:  { primary: '#B9F2FF', bg: 'rgba(185,242,255,0.15)' },
  master:   { primary: '#9B59B6', bg: 'rgba(155,89,182,0.15)' },
  predator: { primary: '#E74C3C', bg: 'rgba(231,76,60,0.15)' },
}

// ── XP Calculation ──────────────────────────────────────────────────

const BASE_XP = 100

/**
 * Calculate XP earned for completing one task.
 * @param {number} tasksCompletedToday - Tasks already completed today (before this one, 0-indexed)
 * @param {number} streakMultiplier - Current streak multiplier (1.0–2.0)
 * @returns {number} XP earned
 */
export function calculateTaskXP(tasksCompletedToday, streakMultiplier = 1.0) {
  const ramp = Math.min(1 + (tasksCompletedToday * 0.15), 3.0)
  return Math.round(BASE_XP * ramp * streakMultiplier)
}

/**
 * Get streak multiplier for a given streak count.
 * @param {number} streakCount - Consecutive days of board clears
 * @returns {number} Multiplier (1.0–2.0)
 */
export function getStreakMultiplier(streakCount) {
  if (streakCount <= 0) return 1.0
  for (const { days, multiplier } of STREAK_THRESHOLDS) {
    if (streakCount >= days) return multiplier
  }
  return 1.0
}

/**
 * Get the rank object for a given XP total.
 * Returns the highest rank whose xpRequired <= xp.
 */
export function getRankForXP(xp) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].xpRequired) return RANKS[i]
  }
  return RANKS[0]
}

/**
 * Get rank object by its id.
 */
export function getRankById(rankId) {
  return RANKS.find(r => r.id === rankId) || RANKS[0]
}

/**
 * Get the next rank after a given rank id. Returns null for Predator.
 */
export function getNextRank(rankId) {
  const idx = RANKS.findIndex(r => r.id === rankId)
  if (idx === -1 || idx === RANKS.length - 1) return null
  return RANKS[idx + 1]
}

/**
 * Get XP progress within the current rank bracket.
 * @returns {{ current: number, needed: number, percentage: number }}
 */
export function getXPProgress(currentXP, currentRankId) {
  const rank = getRankById(currentRankId)
  const next = getNextRank(currentRankId)

  if (!next) {
    // At Predator — show total XP beyond threshold
    return { current: currentXP - rank.xpRequired, needed: 0, percentage: 100 }
  }

  const current = currentXP - rank.xpRequired
  const needed = next.xpRequired - rank.xpRequired
  const percentage = Math.min((current / needed) * 100, 100)

  return { current, needed, percentage }
}

/**
 * Calculate daily XP penalty for uncompleted tasks.
 * Each uncompleted task costs 50 XP, capped by rank tier.
 */
export function calculateDailyPenalty(uncompletedCount, rankId) {
  const rank = getRankById(rankId)
  const rawPenalty = uncompletedCount * 50
  return Math.min(rawPenalty, rank.penaltyCap)
}

/**
 * Calculate total XP earned for a full day of completions.
 * Useful for XP summary breakdown.
 * @param {number} taskCount - Total tasks completed
 * @param {number} streakMultiplier - Current streak multiplier
 * @returns {{ totalXP: number, breakdown: Array<{ task: number, ramp: number, xp: number }> }}
 */
export function calculateDayXP(taskCount, streakMultiplier = 1.0) {
  const breakdown = []
  let totalXP = 0

  for (let i = 0; i < taskCount; i++) {
    const ramp = Math.min(1 + (i * 0.15), 3.0)
    const xp = Math.round(BASE_XP * ramp * streakMultiplier)
    breakdown.push({ task: i + 1, ramp: Math.round(ramp * 100) / 100, xp })
    totalXP += xp
  }

  return { totalXP, breakdown }
}

// ── Hidden Multiplier Tiers ──────────────────────────────────────────────────

export const MULTIPLIER_TIERS = [
  { id: 'common',    label: 'Common',    value: 1.0,  probability: 0.55, color: '#888888' },
  { id: 'rare',      label: 'Rare',      value: 1.5,  probability: 0.25, color: '#4A9EFF' },
  { id: 'epic',      label: 'Epic',      value: 2.0,  probability: 0.12, color: '#9B59B6' },
  { id: 'legendary', label: 'Legendary', value: 3.5,  probability: 0.06, color: '#FFD700' },
  { id: 'mythic',    label: 'Mythic',    value: 10.0, probability: 0.02, color: '#FF3030' },
]

// ── Daily Board Modifier Distributions ──────────────────────────────────────
// Hidden per-day loot probability seeds. Three day types assigned randomly at
// reset. The player never sees these — they are felt, not known.
//
// Cumulative probability thresholds (roll r < threshold → that tier):
//   Standard (60% of days): default odds
//   Warm     (30% of days): moderately shifted toward higher tiers
//   Hot      (10% of days): significantly shifted toward higher tiers

const MODIFIER_DISTRIBUTIONS = {
  standard: [
    { id: 'common', threshold: 0.55 },
    { id: 'rare',   threshold: 0.80 },
    { id: 'epic',   threshold: 0.92 },
    { id: 'legendary', threshold: 0.98 },
    { id: 'mythic', threshold: 1.0 },
  ],
  warm: [
    { id: 'common', threshold: 0.42 },
    { id: 'rare',   threshold: 0.72 },
    { id: 'epic',   threshold: 0.89 },
    { id: 'legendary', threshold: 0.97 },
    { id: 'mythic', threshold: 1.0 },
  ],
  hot: [
    { id: 'common', threshold: 0.28 },
    { id: 'rare',   threshold: 0.61 },
    { id: 'epic',   threshold: 0.83 },
    { id: 'legendary', threshold: 0.95 },
    { id: 'mythic', threshold: 1.0 },
  ],
}

// Precomputed cumulative thresholds for standard weighted roll (legacy fallback)
const MULTIPLIER_THRESHOLDS = (() => {
  let acc = 0
  return MULTIPLIER_TIERS.map(t => { acc += t.probability; return { ...t, threshold: acc } })
})()

/**
 * Roll a hidden multiplier tier using weighted random selection.
 * @param {string} [modifierType='standard'] - Daily board modifier: 'standard' | 'warm' | 'hot'
 * @returns {{ id: string, label: string, value: number, probability: number, color: string }}
 */
export function rollHiddenMultiplier(modifierType = 'standard') {
  const r = Math.random()
  const distribution = MODIFIER_DISTRIBUTIONS[modifierType] ?? MODIFIER_DISTRIBUTIONS.standard
  const hit = distribution.find(d => r < d.threshold) ?? distribution[distribution.length - 1]
  return MULTIPLIER_TIERS.find(t => t.id === hit.id) ?? MULTIPLIER_TIERS[0]
}

/**
 * Look up a multiplier tier object by tier id string.
 */
export function getMultiplierTier(tierId) {
  return MULTIPLIER_TIERS.find(t => t.id === tierId) ?? MULTIPLIER_TIERS[0]
}

/**
 * Calculate XP for a task with hidden multiplier applied.
 * @param {number} tasksCompletedToday - Tasks already completed today (0-indexed before this one)
 * @param {number} streakMultiplier - Current streak multiplier (1.0–2.0)
 * @param {number} hiddenMultiplierValue - The hidden multiplier (1.0, 1.5, 2.0, 3.5, or 10.0)
 * @returns {number} XP earned
 */
export function calculateTaskXPWithMultiplier(tasksCompletedToday, streakMultiplier, hiddenMultiplierValue) {
  const ramp = Math.min(1 + (tasksCompletedToday * 0.15), 3.0)
  return Math.round(BASE_XP * ramp * streakMultiplier * hiddenMultiplierValue)
}

// ── Hourly XP Bleed Utilities ────────────────────────────────────────────────

const BLEED_BASE_RATE = 1.5  // XP/hour — tunable config constant

/**
 * Determine which bleed phase (1, 2, or 3) the current moment falls in,
 * and return its multiplier.
 *
 * Phases are sized to fit a work day, not equal thirds of 24h.
 * With the default 5 AM reset this maps to real clock times:
 *
 *   Phase 1: hours  0–6  after reset →  5 AM–11 AM  → multiplier 1x  (morning grace period)
 *   Phase 2: hours  6–12 after reset → 11 AM–5 PM   → multiplier 3x  (afternoon pressure)
 *   Phase 3: hours 12–17 after reset →  5 PM–10 PM  → multiplier 8x  (evening crunch)
 *
 * After 17h (10 PM with default reset) the rate stays at 8× but no new
 * notifications fire — the work day is over and people are sleeping.
 *
 * @param {number} nowMs - current time as ms since epoch
 * @param {number} resetHourUTC - UTC hour (0-23) of the daily reset
 * @returns {{ phase: 1|2|3, multiplier: number }}
 */
export function getBleedPhase(nowMs, resetHourUTC) {
  const now = new Date(nowMs)
  const utcTotalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const resetMinutesUTC = resetHourUTC * 60

  // Build ms for the most recent reset boundary
  const resetMs = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    resetHourUTC, 0, 0, 0
  ))
  if (utcTotalMinutes < resetMinutesUTC) {
    // Before today's reset hour — last reset was yesterday
    resetMs.setUTCDate(resetMs.getUTCDate() - 1)
  }

  const elapsedHours = (nowMs - resetMs.getTime()) / (1000 * 60 * 60)

  if (elapsedHours < 6)   return { phase: 1, multiplier: 1 }  //  0–6h: morning
  if (elapsedHours < 12)  return { phase: 2, multiplier: 3 }  //  6–12h: afternoon
  return                         { phase: 3, multiplier: 8 }   // 12h+: evening/night
}

/**
 * Calculate XP bleed for one minute (float, may be < 1).
 * Formula: hourly_bleed = BLEED_BASE_RATE × phaseMultiplier × (tasksRemaining ^ 1.25)
 * Per-minute = hourly / 60
 *
 * The caller accumulates the fraction and applies only whole-number XP.
 *
 * @param {number} tasksRemaining - count of bleed-eligible Today tasks
 * @param {number} phaseMultiplier - 1, 3, or 8
 * @returns {number} fractional XP to bleed this minute
 */
export function calculateBleedTick(tasksRemaining, phaseMultiplier) {
  if (tasksRemaining <= 0) return 0
  const hourlyBleed = BLEED_BASE_RATE * phaseMultiplier * Math.pow(tasksRemaining, 1.25)
  return hourlyBleed / 60
}

/**
 * Compute total XP bled across multiple minutes (for catch-up after app is backgrounded).
 * Each minute's phase is computed individually so phase transitions mid-window are correct.
 *
 * @param {number} minutesElapsed - how many missed minutes to compute
 * @param {number} startMs - epoch ms of the first missed tick (lastApplied + 60s)
 * @param {number} resetHourUTC - UTC hour of daily reset
 * @param {number} tasksRemaining - count of bleed-eligible tasks (held constant during catch-up)
 * @param {number} dailyBleedSoFar - XP already bled today before this window
 * @param {number} dailyBleedCap - max XP that can be bled today (rank.penaltyCap)
 * @returns {{ totalXP: number, newDailyBleedTotal: number, capHit: boolean }}
 */
export function calculateCatchUpBleed(
  minutesElapsed, startMs, resetHourUTC,
  tasksRemaining, dailyBleedSoFar, dailyBleedCap
) {
  let accumulated = 0
  let fraction = 0

  for (let i = 0; i < minutesElapsed; i++) {
    const tickMs = startMs + i * 60 * 1000
    const { multiplier } = getBleedPhase(tickMs, resetHourUTC)
    fraction += calculateBleedTick(tasksRemaining, multiplier)

    if (fraction >= 1) {
      const whole = Math.floor(fraction)
      accumulated += whole
      fraction -= whole
    }

    // Stop accumulating if cap would be hit
    if (dailyBleedSoFar + accumulated >= dailyBleedCap) {
      return {
        totalXP: dailyBleedCap - dailyBleedSoFar,
        newDailyBleedTotal: dailyBleedCap,
        capHit: true
      }
    }
  }

  return {
    totalXP: accumulated,
    newDailyBleedTotal: dailyBleedSoFar + accumulated,
    capHit: false
  }
}
