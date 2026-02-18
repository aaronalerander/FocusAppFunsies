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
