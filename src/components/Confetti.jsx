import { useEffect } from 'react'
import confetti from 'canvas-confetti'

// ── Palettes ──────────────────────────────────────────────────────────────
const BRAND     = ['#C8F135', '#a8cc1a', '#88aa10']
const WHITE     = ['#ffffff', '#EDEDED']
const RARE      = ['#4A9EFF', '#7BC4FF', '#B8DCFF', '#ffffff']
const EPIC      = ['#9B59B6', '#C47DDB', '#E0AAFF', '#ffffff']
const LEGENDARY = ['#FFD700', '#FFA500', '#FFEC8B', '#FF6B35', '#ffffff']
const MYTHIC    = ['#FF3030', '#FF6B6B', '#FFD700', '#FF3CAC', '#00D4FF', '#C8F135', '#ffffff']
const FREE_XP   = ['#FFD700', '#DAA520', '#C0C0C0', '#A9A9A9', '#1A1A1A', '#2A2A2A', '#000000']

// ── Per-tier fire functions ────────────────────────────────────────────────

// Common (1x) — just a tiny puff, barely anything
function fireCommon(isFreeXP) {
  confetti({
    particleCount: 24,
    spread: 35,
    origin: { x: 0.5, y: 0.58 },
    colors: isFreeXP ? FREE_XP : [...BRAND, ...WHITE],
    ticks: 80,
    gravity: 1.8,
    scalar: 0.7,
    startVelocity: 14,
    decay: 0.85,
  })
}

// Rare (1.5x) — small single burst
function fireRare(isFreeXP) {
  confetti({
    particleCount: 90,
    spread: 55,
    origin: { x: 0.5, y: 0.55 },
    colors: isFreeXP ? FREE_XP : RARE,
    ticks: 140,
    gravity: 1.4,
    scalar: 0.85,
    startVelocity: 24,
    decay: 0.88,
  })
}

// Epic (2x) — medium burst with a quick second wave
function fireEpic(isFreeXP) {
  const colors = isFreeXP ? FREE_XP : EPIC
  confetti({
    particleCount: 160,
    spread: 70,
    origin: { x: 0.5, y: 0.5 },
    colors,
    ticks: 190,
    gravity: 1.2,
    scalar: 1.0,
    startVelocity: 30,
    decay: 0.89,
  })
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 50,
      origin: { x: 0.5, y: 0.55 },
      colors,
      ticks: 150,
      gravity: 1.4,
      scalar: 0.85,
      startVelocity: 20,
      decay: 0.87,
    })
  }, 220)
}

// Legendary (3.5x) — big multi-burst
function fireLegendary(isFreeXP) {
  const colors = isFreeXP ? FREE_XP : LEGENDARY
  // Center
  confetti({
    particleCount: 260,
    spread: 85,
    origin: { x: 0.5, y: 0.4 },
    colors,
    ticks: 260,
    gravity: 1.0,
    scalar: 1.1,
    startVelocity: 38,
  })
  // Left cannon
  setTimeout(() => {
    confetti({
      particleCount: 120,
      angle: 65,
      spread: 45,
      origin: { x: 0, y: 0.6 },
      colors,
      ticks: 220,
      gravity: 1.1,
      startVelocity: 48,
    })
  }, 180)
  // Right cannon
  setTimeout(() => {
    confetti({
      particleCount: 120,
      angle: 115,
      spread: 45,
      origin: { x: 1, y: 0.6 },
      colors,
      ticks: 220,
      gravity: 1.1,
      startVelocity: 48,
    })
  }, 320)
  // Final top shower
  setTimeout(() => {
    confetti({
      particleCount: 140,
      spread: 100,
      origin: { x: 0.5, y: 0.3 },
      colors,
      ticks: 200,
      gravity: 1.3,
      scalar: 0.9,
      startVelocity: 28,
    })
  }, 550)
}

// Mythic (10x) — full-on jackpot: rapid cannons → massive center explosion → corner rain → flourish
function fireMythic(isFreeXP) {
  const colors = isFreeXP ? FREE_XP : MYTHIC

  const sideBurst = (side, delay) => {
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: side === 'left' ? 65 : 115,
        spread: 40,
        origin: { x: side === 'left' ? 0 : 1, y: 0.6 },
        colors,
        ticks: 260,
        gravity: 0.9,
        startVelocity: 58,
        scalar: 1.0,
        decay: 0.92,
      })
    }, delay)
  }

  // Phase 1: rapid alternating side cannons
  sideBurst('left',  0)
  sideBurst('right', 90)
  sideBurst('left',  180)
  sideBurst('right', 270)
  sideBurst('left',  360)
  sideBurst('right', 450)

  // Phase 2: huge center explosion
  setTimeout(() => {
    confetti({
      particleCount: 440,
      spread: 110,
      origin: { x: 0.5, y: 0.3 },
      colors,
      ticks: 380,
      gravity: 0.75,
      startVelocity: 48,
      scalar: 1.3,
      drift: 0,
    })
  }, 650)

  // Phase 3: top-corner rain
  setTimeout(() => {
    confetti({
      particleCount: 180,
      angle: 80,
      spread: 30,
      origin: { x: 0.1, y: 0 },
      colors,
      ticks: 320,
      gravity: 1.0,
      startVelocity: 38,
      scalar: 0.9,
    })
  }, 880)
  setTimeout(() => {
    confetti({
      particleCount: 180,
      angle: 100,
      spread: 30,
      origin: { x: 0.9, y: 0 },
      colors,
      ticks: 320,
      gravity: 1.0,
      startVelocity: 38,
      scalar: 0.9,
    })
  }, 1060)

  // Phase 4: wide final flourish
  setTimeout(() => {
    confetti({
      particleCount: 200,
      spread: 130,
      origin: { x: 0.5, y: 0.5 },
      colors,
      ticks: 220,
      gravity: 1.3,
      startVelocity: 32,
      scalar: 1.0,
      decay: 0.9,
    })
  }, 1380)
}

// ── Rank Up — max intensity, all colors, sustained multi-wave ─────────────────
export function fireRankUpConfetti(tierColor, isMajor = false) {
  const colors = [tierColor, '#FFD700', '#FF3CAC', '#00D4FF', '#C8F135', '#ffffff', '#FF6B6B']
  // Major promotions (tier change) get 3x the particle intensity
  const scale = isMajor ? 3.0 : 1.0

  const sideBurst = (side, delay, count = 120) => {
    setTimeout(() => {
      confetti({
        particleCount: Math.round(count * scale),
        angle: side === 'left' ? 60 : 120,
        spread: 55,
        origin: { x: side === 'left' ? 0 : 1, y: 0.55 },
        colors,
        ticks: 400,
        gravity: 0.85,
        startVelocity: 70,
        scalar: 1.1,
        decay: 0.93,
      })
    }, delay)
  }

  // Phase 1: opening salvo — rapid side cannons
  sideBurst('left',  0)
  sideBurst('right', 60)
  sideBurst('left',  120)
  sideBurst('right', 180)
  sideBurst('left',  240)
  sideBurst('right', 300)
  sideBurst('left',  360)
  sideBurst('right', 420)

  // Phase 2: massive center explosion
  setTimeout(() => {
    confetti({
      particleCount: Math.round(600 * scale),
      spread: 130,
      origin: { x: 0.5, y: 0.25 },
      colors,
      ticks: 500,
      gravity: 0.65,
      startVelocity: 55,
      scalar: 1.4,
      drift: 0,
    })
  }, 500)

  // Phase 3: top-corner waterfalls
  setTimeout(() => {
    confetti({ particleCount: Math.round(250 * scale), angle: 75, spread: 40, origin: { x: 0.05, y: 0 }, colors, ticks: 450, gravity: 1.1, startVelocity: 45, scalar: 1.0 })
  }, 700)
  setTimeout(() => {
    confetti({ particleCount: Math.round(250 * scale), angle: 105, spread: 40, origin: { x: 0.95, y: 0 }, colors, ticks: 450, gravity: 1.1, startVelocity: 45, scalar: 1.0 })
  }, 820)

  // Phase 4: second center burst
  setTimeout(() => {
    confetti({
      particleCount: Math.round(350 * scale),
      spread: 100,
      origin: { x: 0.5, y: 0.4 },
      colors,
      ticks: 380,
      gravity: 0.9,
      startVelocity: 42,
      scalar: 1.2,
    })
  }, 1100)

  // Phase 5: sustained side cannons
  sideBurst('left',  1400, 150)
  sideBurst('right', 1500, 150)
  sideBurst('left',  1600, 120)
  sideBurst('right', 1700, 120)

  // Phase 6: grand finale shower
  setTimeout(() => {
    confetti({
      particleCount: Math.round(500 * scale),
      spread: 160,
      origin: { x: 0.5, y: 0.3 },
      colors,
      ticks: 350,
      gravity: 1.1,
      startVelocity: 38,
      scalar: 1.0,
      decay: 0.91,
    })
  }, 2000)
}

// ── Tier dispatch ──────────────────────────────────────────────────────────
function fireTier(tierId, isFreeXP) {
  switch (tierId) {
    case 'mythic':    return fireMythic(isFreeXP)
    case 'legendary': return fireLegendary(isFreeXP)
    case 'epic':      return fireEpic(isFreeXP)
    case 'rare':      return fireRare(isFreeXP)
    default:          return fireCommon(isFreeXP)  // common / unknown
  }
}

// ── All-done multi-burst (board cleared) — intensity still scales with tier ─
// Base particle counts are multiplied by the tier's scale factor.
const TIER_SCALE = { common: 0.35, rare: 0.65, epic: 1.0, legendary: 1.4, mythic: 2.0 }

function fireAllDone(tierId, isFreeXP) {
  const scale = TIER_SCALE[tierId] ?? 0.35
  const colors = isFreeXP ? FREE_XP : (
    tierId === 'mythic'    ? MYTHIC :
    tierId === 'legendary' ? LEGENDARY :
    tierId === 'epic'      ? EPIC :
    tierId === 'rare'      ? RARE :
    [...BRAND, ...WHITE]
  )

  // Center
  confetti({
    particleCount: Math.round(200 * scale),
    spread: 70,
    origin: { y: 0.4 },
    colors,
    ticks: Math.round(200 * Math.max(scale, 0.5)),
    gravity: 1.2,
    scalar: 1.1,
  })
  // Left
  setTimeout(() => {
    confetti({
      particleCount: Math.round(120 * scale),
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.5 },
      colors,
      ticks: Math.round(180 * Math.max(scale, 0.5)),
    })
  }, 200)
  // Right
  setTimeout(() => {
    confetti({
      particleCount: Math.round(120 * scale),
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.5 },
      colors,
      ticks: Math.round(180 * Math.max(scale, 0.5)),
    })
  }, 350)

  // For legendary/mythic: add an extra top shower
  if (scale >= 1.4) {
    setTimeout(() => {
      confetti({
        particleCount: Math.round(160 * scale),
        spread: 100,
        origin: { x: 0.5, y: 0.2 },
        colors,
        ticks: 280,
        gravity: 0.9,
        startVelocity: 40,
        scalar: 1.1,
      })
    }, 600)
  }
}

// ── Component ─────────────────────────────────────────────────────────────
// confetti: { mode: 'normal'|'allDone'|'rankUp', id, isFreeXP, multiplierTierId, tierColor }
export default function Confetti({ confetti }) {
  useEffect(() => {
    if (!confetti) return

    const isFreeXP = !!confetti.isFreeXP
    const tierId = confetti.multiplierTierId || 'common'

    // rankUp confetti is fired into a local canvas inside RankUpAnimation
    // so it stays within the overlay. Skip it here to avoid the global
    // canvas-confetti canvas (z-200) painting above the overlay.
    if (confetti.mode === 'rankUp')       return
    else if (confetti.mode === 'allDone') fireAllDone(tierId, isFreeXP)
    else                                  fireTier(tierId, isFreeXP)
  }, [confetti])

  return null
}
