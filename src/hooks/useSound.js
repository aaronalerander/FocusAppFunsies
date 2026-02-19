// Web Audio API chime synthesizer — no sound files needed
// Intensity scales with how many tasks have been completed today.

let ctx = null

function getCtx() {
  if (!ctx) ctx = new AudioContext()
  // Browsers/Electron suspend AudioContext until a user gesture occurs.
  // Resume it every time so sounds fire reliably after the app has been idle.
  if (ctx.state === 'suspended') ctx.resume()
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

// ── Task Added Sound ─────────────────────────────────────────────────────────
// Distinct from the completion chime — lighter, shorter, "queued" feeling.
// A soft descending two-note tap: the task is registered, not celebrated.
export function playTaskAdded() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    // Quick high-to-low tap — acknowledges input without fanfare
    tone(ac, G5, t,        0.18, 0.09, 'sine')
    tone(ac, E5, t + 0.07, 0.22, 0.07, 'sine')
  } catch (err) {
    console.warn('[useSound] task added error:', err)
  }
}

// ── Slot Machine Entrance ────────────────────────────────────────────────────
// Deep cinematic swell that plays as the overlay fades in — builds hype.
// Uses a full ADSR envelope (attack → sustain → release) so it never cuts out.
// Total duration ≈ 3s, sustains for ~1.5s before gently releasing.
export function playSlotEntrance() {
  try {
    const ac = getCtx()
    const t = ac.currentTime

    // Helper: ADSR oscillator — attack, sustain at peakGain, release
    function adsr(freq, startTime, attackDur, sustainDur, releaseDur, peakGain, type = 'sine') {
      const osc = ac.createOscillator()
      const env = ac.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, startTime)

      env.gain.setValueAtTime(0, startTime)
      // Attack — ramp up to peak
      env.gain.linearRampToValueAtTime(peakGain, startTime + attackDur)
      // Sustain — hold (slight dip to 85% for natural feel)
      env.gain.linearRampToValueAtTime(peakGain * 0.85, startTime + attackDur + sustainDur)
      // Release — smooth exponential fade to silence
      env.gain.exponentialRampToValueAtTime(0.0001, startTime + attackDur + sustainDur + releaseDur)

      osc.connect(env)
      env.connect(ac.destination)
      osc.start(startTime)
      osc.stop(startTime + attackDur + sustainDur + releaseDur + 0.05)
    }

    // Sub-bass drone — slow swell, holds through the whole glass fade-in
    adsr(48,  t,       0.9, 1.4, 0.7, 0.09, 'sine')       // fundamental: 48Hz sub-bass
    adsr(72,  t + 0.1, 0.8, 1.2, 0.7, 0.06, 'sine')       // perfect fifth above
    // Warm mid-range pad — enters as glass settles
    adsr(C5,  t + 0.6, 0.5, 1.0, 0.8, 0.07, 'triangle')  // C5 warmth
    adsr(G5,  t + 0.9, 0.4, 0.9, 0.7, 0.05, 'triangle')  // G5 — open fifth
    // Bright shimmer rise — sparkle just before reels appear
    adsr(C6,  t + 1.3, 0.25, 0.5, 0.8, 0.04, 'sine')     // C6 bell shimmer
    adsr(E6,  t + 1.6, 0.20, 0.4, 0.8, 0.03, 'sine')     // E6 top shimmer
  } catch (err) {
    console.warn('[useSound] slot entrance error:', err)
  }
}

// ── Slot Machine Sounds ──────────────────────────────────────────────────────

// Short percussive click played when each reel locks
export function playSlotLock() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    tone(ac, 220, t,        0.10, 0.18, 'square')
    tone(ac, 440, t + 0.01, 0.07, 0.07, 'triangle')
  } catch (err) {
    console.warn('[useSound] slot lock error:', err)
  }
}

// Common — single soft ding, no fanfare
export function playSlotResultCommon() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    tone(ac, C5, t, 0.35, 0.10)
  } catch (err) {
    console.warn('[useSound] slot common error:', err)
  }
}

// Rare — rising two-note with shimmer
export function playSlotResultRare() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    tone(ac, C5, t,        0.40, 0.13)
    tone(ac, E5, t + 0.14, 0.50, 0.12)
    tone(ac, E5 * 2, t + 0.14, 0.50, 0.04, 'triangle')
  } catch (err) {
    console.warn('[useSound] slot rare error:', err)
  }
}

// Epic — three-note chime + shimmer
export function playSlotResultEpic() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    tone(ac, C5, t,        0.45, 0.14)
    tone(ac, G5, t + 0.12, 0.50, 0.13)
    tone(ac, C6, t + 0.24, 0.60, 0.12)
    tone(ac, C6, t + 0.24, 0.80, 0.05, 'triangle')
  } catch (err) {
    console.warn('[useSound] slot epic error:', err)
  }
}

// Legendary — full ascending arpeggio + chord hold + bell
export function playSlotResultLegendary() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    tone(ac, C5, t,        0.45, 0.14)
    tone(ac, E5, t + 0.09, 0.48, 0.13)
    tone(ac, G5, t + 0.18, 0.52, 0.12)
    tone(ac, C6, t + 0.27, 0.62, 0.12)
    tone(ac, E6, t + 0.36, 0.68, 0.11)
    // Chord hold
    tone(ac, C5, t + 0.44, 0.90, 0.08)
    tone(ac, E5, t + 0.44, 0.90, 0.07)
    tone(ac, G5, t + 0.44, 0.90, 0.07)
    tone(ac, C6, t + 0.44, 0.90, 0.07)
    // Bell on top
    tone(ac, E6, t + 0.50, 0.80, 0.06, 'triangle')
  } catch (err) {
    console.warn('[useSound] slot legendary error:', err)
  }
}

// Mythic — sub-bass rumble + full arpeggio + hold + second flourish
export function playSlotResultMythic() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    // Sub-bass rumble
    tone(ac, 55,  t, 1.2, 0.06, 'sawtooth')
    tone(ac, 110, t, 1.0, 0.05, 'sawtooth')
    // Rising arpeggio
    tone(ac, C5, t + 0.05, 0.45, 0.15)
    tone(ac, E5, t + 0.12, 0.48, 0.14)
    tone(ac, G5, t + 0.19, 0.50, 0.13)
    tone(ac, C6, t + 0.26, 0.58, 0.13)
    tone(ac, E6, t + 0.33, 0.68, 0.12)
    // Triumphant chord hold
    tone(ac, C5, t + 0.50, 1.20, 0.10)
    tone(ac, E5, t + 0.50, 1.20, 0.09)
    tone(ac, G5, t + 0.50, 1.20, 0.09)
    tone(ac, C6, t + 0.50, 1.20, 0.09)
    tone(ac, E6, t + 0.55, 1.00, 0.08, 'triangle')
    // Second flourish at ~1s
    tone(ac, C6,       t + 1.00, 0.50, 0.10)
    tone(ac, E6,       t + 1.08, 0.50, 0.09)
    tone(ac, C6 * 1.5, t + 1.16, 0.60, 0.08, 'triangle')
  } catch (err) {
    console.warn('[useSound] slot mythic error:', err)
  }
}

// ── Tier-Differentiated Completion Sound ────────────────────────────────────
// Plays after the slot machine resolves — a distinct confirmation chime that
// scales with the tier. Uses the Tier1-5 chimes (not the slot sounds) so it
// feels like a satisfying stamp of completion rather than a repeated echo.
// isAllDone overrides to board-clear swell regardless of tier.
export function playCompletionSoundByTier(tierId, isAllDone) {
  try {
    if (isAllDone) {
      playTier5()
      return
    }
    switch (tierId) {
      case 'mythic':    playTier5(); break
      case 'legendary': playTier4(); break
      case 'epic':      playTier3(); break
      case 'rare':      playTier2(); break
      default:          playTier1(); break
    }
  } catch (err) {
    console.warn('[useSound] completion tier sound error:', err)
  }
}

// ── Last Task Moment — Ambient Hum ───────────────────────────────────────────
// A barely-audible sustained tone that begins when exactly one task remains.
// Present rather than prominent — the hum before something happens.

let humOsc = null
let humGain = null

export function startLastTaskHum() {
  try {
    if (humOsc) return  // already running
    const ac = getCtx()
    const t = ac.currentTime

    humGain = ac.createGain()
    humGain.gain.setValueAtTime(0, t)
    humGain.gain.linearRampToValueAtTime(0.018, t + 1.2)  // slow fade-in
    humGain.connect(ac.destination)

    humOsc = ac.createOscillator()
    humOsc.type = 'sine'
    humOsc.frequency.setValueAtTime(80, t)
    humOsc.connect(humGain)
    humOsc.start(t)
  } catch (err) {
    console.warn('[useSound] last task hum start error:', err)
  }
}

export function stopLastTaskHum() {
  try {
    if (!humOsc || !humGain) return
    const ac = getCtx()
    const t = ac.currentTime
    humGain.gain.setValueAtTime(humGain.gain.value, t)
    humGain.gain.linearRampToValueAtTime(0.0001, t + 0.4)
    const oscRef = humOsc
    const gainRef = humGain
    humOsc = null
    humGain = null
    setTimeout(() => {
      try { oscRef.stop(); oscRef.disconnect() } catch (_) {}
      try { gainRef.disconnect() } catch (_) {}
    }, 450)
  } catch (err) {
    console.warn('[useSound] last task hum stop error:', err)
  }
}

// ── Rank Proximity Tone ──────────────────────────────────────────────────────
// Fired once when the rank proximity glow activates. Single soft rising tone,
// barely audible — announces the glow without being attention-seeking.
export function playRankProximityTone() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    tone(ac, C5, t,        0.20, 0.06)
    tone(ac, E5, t + 0.12, 0.25, 0.05)
  } catch (err) {
    console.warn('[useSound] rank proximity tone error:', err)
  }
}

// ── Bleed Tick ───────────────────────────────────────────────────────────────
// Near-silent descending tick — awareness, not punishment.
// Inaudible from a neighboring table at a coffee shop.
export function playBleedTick() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    tone(ac, E5, t,        0.08, 0.025)
    tone(ac, C5, t + 0.06, 0.09, 0.020)
  } catch (err) {
    console.warn('[useSound] bleed tick error:', err)
  }
}

// ── Bleed Cap Hit ────────────────────────────────────────────────────────────
// Single muted thud — closure, not celebration. Signals bleed has stopped.
export function playBleedCapHit() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    tone(ac, 220, t,        0.15, 0.05, 'square')
    tone(ac, 110, t + 0.04, 0.20, 0.04, 'square')
  } catch (err) {
    console.warn('[useSound] bleed cap hit error:', err)
  }
}

// ── Daily Reset Chime ────────────────────────────────────────────────────────
// Soft chime sequence — a new day starting, unhurried.
export function playDailyReset() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    tone(ac, C5, t,        0.5, 0.10)
    tone(ac, G5, t + 0.22, 0.55, 0.09)
    tone(ac, C6, t + 0.50, 0.7, 0.08)
    tone(ac, C6, t + 0.50, 0.9, 0.04, 'triangle')
  } catch (err) {
    console.warn('[useSound] daily reset error:', err)
  }
}

// ── Rank Up Fanfare ───────────────────────────────────────────────────────────
// Triumphal multi-layer fanfare — unmistakably bigger than any loot sound.
// Sub-bass impact → rising arpeggio → chord swell → triumphant bell crown.
export function playRankUp() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    // Deep impact thud
    tone(ac, 55,  t,        0.20, 0.18, 'sawtooth')
    tone(ac, 110, t + 0.02, 0.18, 0.14, 'sawtooth')
    // Rising arpeggio — fast and heroic
    tone(ac, C5,       t + 0.08, 0.35, 0.18)
    tone(ac, E5,       t + 0.16, 0.38, 0.17)
    tone(ac, G5,       t + 0.24, 0.40, 0.16)
    tone(ac, C6,       t + 0.32, 0.45, 0.16)
    tone(ac, E6,       t + 0.40, 0.50, 0.15)
    tone(ac, C6 * 1.5, t + 0.48, 0.55, 0.13, 'triangle')
    // Full chord swell
    tone(ac, C5, t + 0.60, 1.40, 0.13)
    tone(ac, E5, t + 0.60, 1.40, 0.12)
    tone(ac, G5, t + 0.60, 1.40, 0.12)
    tone(ac, C6, t + 0.60, 1.40, 0.12)
    tone(ac, E6, t + 0.65, 1.20, 0.10, 'triangle')
    // Second triumphant peak at ~1.2s
    tone(ac, C6,       t + 1.15, 0.60, 0.14)
    tone(ac, E6,       t + 1.23, 0.60, 0.13)
    tone(ac, C6 * 1.5, t + 1.31, 0.70, 0.11, 'triangle')
    // Final bell crown
    tone(ac, C6 * 2,   t + 1.50, 0.80, 0.09, 'triangle')
    tone(ac, E6 * 1.5, t + 1.60, 0.70, 0.07, 'triangle')
  } catch (err) {
    console.warn('[useSound] rank up error:', err)
  }
}

// ── Public API (legacy — kept for backward compatibility) ────────────────────
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
