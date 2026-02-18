import { useEffect } from 'react'
import confetti from 'canvas-confetti'

// ── Palettes ──────────────────────────────────────────────────────────────
const BRAND   = ['#C8F135', '#a8cc1a', '#88aa10']
const WHITE   = ['#ffffff', '#EDEDED']
const JACKPOT = ['#FFD700', '#FF6B35', '#C8F135', '#FF3CAC', '#00D4FF', '#ffffff']

// ── Normal burst (every task) — small & quick ─────────────────────────────
function fireNormal() {
  confetti({
    particleCount: 28,
    spread: 50,
    origin: { x: 0.5, y: 0.55 },
    colors: [...BRAND, ...WHITE],
    ticks: 120,
    gravity: 1.4,
    scalar: 0.8,
    startVelocity: 22,
    decay: 0.88
  })
}

// ── All-done burst (existing behaviour, preserved exactly) ─────────────────
function fireAllDone() {
  // Center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.4 },
    colors: [...BRAND, ...WHITE],
    ticks: 200,
    gravity: 1.2,
    scalar: 1.1
  })
  // Left
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.5 },
      colors: [...BRAND, '#ffffff'],
      ticks: 180
    })
  }, 200)
  // Right
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.5 },
      colors: [...BRAND, '#ffffff'],
      ticks: 180
    })
  }, 350)
}

// ── Jackpot sequence (every 3rd task) — slot machine style ────────────────
function fireJackpot() {
  const sideBurst = (side, delay) => {
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: side === 'left' ? 65 : 115,
        spread: 40,
        origin: { x: side === 'left' ? 0 : 1, y: 0.6 },
        colors: JACKPOT,
        ticks: 250,
        gravity: 0.9,
        startVelocity: 55,
        scalar: 1.0,
        decay: 0.92
      })
    }, delay)
  }

  // Phase 1 (0–500ms): Rapid alternating side cannons — slot reels spinning in
  sideBurst('left',  0)
  sideBurst('right', 100)
  sideBurst('left',  200)
  sideBurst('right', 300)
  sideBurst('left',  400)
  sideBurst('right', 500)

  // Phase 2 (700ms): Big center explosion — JACKPOT payout moment
  setTimeout(() => {
    confetti({
      particleCount: 160,
      spread: 100,
      origin: { x: 0.5, y: 0.3 },
      colors: JACKPOT,
      ticks: 350,
      gravity: 0.8,
      startVelocity: 45,
      scalar: 1.2,
      drift: 0
    })
  }, 700)

  // Phase 3 (900ms & 1100ms): Top-corner cascades — coins raining down
  setTimeout(() => {
    confetti({
      particleCount: 70,
      angle: 80,
      spread: 30,
      origin: { x: 0.1, y: 0 },
      colors: JACKPOT,
      ticks: 300,
      gravity: 1.0,
      startVelocity: 35,
      scalar: 0.9
    })
  }, 900)
  setTimeout(() => {
    confetti({
      particleCount: 70,
      angle: 100,
      spread: 30,
      origin: { x: 0.9, y: 0 },
      colors: JACKPOT,
      ticks: 300,
      gravity: 1.0,
      startVelocity: 35,
      scalar: 0.9
    })
  }, 1100)

  // Phase 4 (1400ms): Wide final flourish — machine lighting up
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 120,
      origin: { x: 0.5, y: 0.5 },
      colors: JACKPOT,
      ticks: 200,
      gravity: 1.3,
      startVelocity: 30,
      scalar: 1.0,
      decay: 0.9
    })
  }, 1400)
}

// ── Component ─────────────────────────────────────────────────────────────
// `confetti` is { mode, id } — a new object each time so useEffect always fires
export default function Confetti({ confetti }) {
  useEffect(() => {
    if (!confetti) return

    if (confetti.mode === 'normal')  fireNormal()
    if (confetti.mode === 'jackpot') fireJackpot()
    if (confetti.mode === 'allDone') fireAllDone()
  }, [confetti])

  return null
}
