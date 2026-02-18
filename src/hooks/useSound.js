// Web Audio API chime synthesizer — no sound files needed
// Intensity scales with how many tasks have been completed today.

let ctx = null

function getCtx() {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

// ── Tone primitive ──────────────────────────────────────────────────────────
// Plays a single oscillator with an attack/decay envelope.
function tone(ac, freq, startTime, duration, gain = 0.15, type = 'sine') {
  const osc = ac.createOscillator()
  const env = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)

  env.gain.setValueAtTime(0, startTime)
  env.gain.linearRampToValueAtTime(gain, startTime + 0.012)
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  osc.connect(env)
  env.connect(ac.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.05)
}

// Note frequencies (Hz)
const C5  = 523.25
const E5  = 659.25
const G5  = 783.99
const C6  = 1046.50
const E6  = 1318.51

// ── Tier 1 — 1 task: single soft ding ──────────────────────────────────────
function playTier1() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, C5, t, 0.5, 0.16)
}

// ── Tier 2 — 2 tasks: two-note rise ────────────────────────────────────────
function playTier2() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, C5, t,        0.4, 0.15)
  tone(ac, E5, t + 0.13, 0.5, 0.13)
}

// ── Tier 3 — 3 tasks: three-note ascent ────────────────────────────────────
function playTier3() {
  const ac = getCtx()
  const t = ac.currentTime
  tone(ac, C5, t,        0.4, 0.15)
  tone(ac, E5, t + 0.11, 0.45, 0.13)
  tone(ac, G5, t + 0.22, 0.55, 0.12)
}

// ── Tier 4 — 4–5 tasks: full arpeggio + shimmer layer ──────────────────────
function playTier4() {
  const ac = getCtx()
  const t = ac.currentTime
  // Main arpeggio
  tone(ac, C5, t,        0.4,  0.14)
  tone(ac, E5, t + 0.09, 0.45, 0.13)
  tone(ac, G5, t + 0.18, 0.5,  0.12)
  tone(ac, C6, t + 0.27, 0.6,  0.11)
  // Shimmer: quiet triangle overtone riding the top note
  tone(ac, C6, t + 0.27, 0.8,  0.05, 'triangle')
}

// ── Tier 5 — 6+ tasks / all-done: chord swell ──────────────────────────────
function playTier5() {
  const ac = getCtx()
  const t = ac.currentTime
  // Chord — staggered attack for a swell feel
  tone(ac, C5, t,        0.9, 0.13)
  tone(ac, E5, t + 0.04, 0.9, 0.11)
  tone(ac, G5, t + 0.08, 0.9, 0.10)
  tone(ac, C6, t + 0.13, 0.8, 0.10)
  // Bell on top — triangle for brightness
  tone(ac, E6, t + 0.20, 0.7, 0.07, 'triangle')
  // Sub-octave body — square wave very quiet for fullness
  tone(ac, C5 / 2, t, 0.6, 0.04, 'square')
}

// ── Public API ──────────────────────────────────────────────────────────────
// completedToday: number of tasks completed so far today (including this one)
// isAllDone:      true if this completion clears the entire today list
export function playCompletionSound(completedToday, isAllDone) {
  try {
    if (isAllDone || completedToday >= 6) {
      playTier5()
    } else if (completedToday >= 4) {
      playTier4()
    } else if (completedToday === 3) {
      playTier3()
    } else if (completedToday === 2) {
      playTier2()
    } else {
      playTier1()
    }
  } catch (err) {
    console.warn('[useSound] AudioContext error:', err)
  }
}
