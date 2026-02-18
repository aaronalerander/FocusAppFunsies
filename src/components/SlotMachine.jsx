import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { MULTIPLIER_TIERS } from '@/utils/progression'
import {
  playSlotLock,
  playSlotResultCommon,
  playSlotResultRare,
  playSlotResultEpic,
  playSlotResultLegendary,
  playSlotResultMythic,
} from '@/hooks/useSound'

// ── Tier config ───────────────────────────────────────────────────────────
//
// Research basis (Clark et al. 2009, Murch et al. 2020, Mentzoni et al. 2010):
// – The anticipatory spin window that maximises arousal is 2.8–6s flat across
//   all tiers. Longer spins don't add tension — they become tedious.
// – Tier differentiation comes from HOLD time (how long the result stays up),
//   not spin length. The result is what the player remembers (peak-end rule).
// – Near-miss frames should be 300–600ms each to register consciously.
// – SCR (skin conductance) peaks 3–6s after reveal — hold must cover this.

const TIER_DURATION = {
  common:    3000,  // 3.0s — within the validated 2.8–6s arousal window
  rare:      3200,  // 3.2s — barely longer; suspense is equal, payoff scales
  epic:      3400,  // 3.4s
  legendary: 3800,  // 3.8s — slight extra crawl before the lock
  mythic:    4200,  // 4.2s — maximum spin without hitting tedium threshold
}

const TIER_HOLD = {
  common:    1500,  // 1.5s — enough to read the result
  rare:      2200,  // 2.2s
  epic:      3200,  // 3.2s — SCR onset window begins here
  legendary: 5000,  // 5.0s — full SCR peak (matches Overwatch study hold)
  mythic:    7000,  // 7.0s — maximum arousal window; feels like a jackpot
}

const TIER_RESULT_SOUNDS = {
  common:    playSlotResultCommon,
  rare:      playSlotResultRare,
  epic:      playSlotResultEpic,
  legendary: playSlotResultLegendary,
  mythic:    playSlotResultMythic,
}

// ── Psychologically optimized spin sequence ───────────────────────────────
// Slot machines show high values frequently during the spin to maximize
// excitement, with the actual result at the end. The sequence repeats
// several times during the spin with a near-miss cluster at the end.
//
// Pattern: common values anchor the spin, rare/epic appear frequently,
// legendary appears 2x before the final lock (near-miss feel),
// mythic flashes once near the end for max tension.

const SPIN_SEQUENCE = [
  { id: 'common',    value: '1x',    color: '#888888' },
  { id: 'rare',      value: '1.5x',  color: '#4A9EFF' },
  { id: 'common',    value: '1x',    color: '#888888' },
  { id: 'epic',      value: '2x',    color: '#9B59B6' },
  { id: 'rare',      value: '1.5x',  color: '#4A9EFF' },
  { id: 'legendary', value: '3.5x',  color: '#FFD700' },
  { id: 'common',    value: '1x',    color: '#888888' },
  { id: 'rare',      value: '1.5x',  color: '#4A9EFF' },
  { id: 'epic',      value: '2x',    color: '#9B59B6' },
  { id: 'legendary', value: '3.5x',  color: '#FFD700' },
  { id: 'mythic',    value: '10x',   color: '#FF3030' },
  { id: 'common',    value: '1x',    color: '#888888' },
]

// Near-miss tail shown on reels 1 and 2 just before locking — always ends
// one tier above the actual result so the final reel "settles down"
function getNearMissTail(targetId) {
  const idx = MULTIPLIER_TIERS.findIndex(t => t.id === targetId)
  // Show the tier above if it exists, otherwise mythic
  const above = MULTIPLIER_TIERS[Math.min(idx + 1, MULTIPLIER_TIERS.length - 1)]
  const twoAbove = MULTIPLIER_TIERS[Math.min(idx + 2, MULTIPLIER_TIERS.length - 1)]
  return [twoAbove, above] // two frames of higher values before locking
}

// ── Single reel ───────────────────────────────────────────────────────────

function Reel({ targetTierId, lockAt, totalDuration, reelIndex }) {
  const [displayItem, setDisplayItem] = useState(SPIN_SEQUENCE[0])
  const [locked, setLocked] = useState(false)
  const startRef = useRef(null)
  const frameRef = useRef(null)
  const lockedRef = useRef(false)

  const target = MULTIPLIER_TIERS.find(t => t.id === targetTierId)
  const nearMissTail = getNearMissTail(targetTierId)

  useEffect(() => {
    startRef.current = performance.now()
    let seqIndex = 0

    // Speed curve: fast in the middle, slows down before locking
    function getFrameDelay(elapsed) {
      const progress = elapsed / totalDuration
      if (progress < 0.25) return 60         // fast spin
      if (progress < 0.50) return 80         // medium-fast
      if (progress < 0.70) return 120        // slowing
      if (progress < 0.85) return 180        // slow crawl
      return 260                             // nearly stopped
    }

    function tick() {
      const elapsed = performance.now() - startRef.current

      if (elapsed >= lockAt && !lockedRef.current) {
        // Show near-miss tail: flash one or two higher tiers before landing
        lockedRef.current = true
        const tail = getNearMissTail(targetTierId)

        // Flash first near-miss frame — 400ms each, within the 300–600ms
        // conscious-registration window (Clark et al. 2009)
        setDisplayItem(tail[0])
        setTimeout(() => {
          // Flash second near-miss frame (one tier closer)
          setDisplayItem(tail[1])
          setTimeout(() => {
            // Land on actual result
            setDisplayItem({
              id: target.id,
              value: target.value === 1.0 ? '1x' :
                     target.value === 1.5 ? '1.5x' :
                     target.value === 2.0 ? '2x' :
                     target.value === 3.5 ? '3.5x' : '10x',
              color: target.color,
            })
            setLocked(true)
          }, 400)
        }, 400)
        return
      }

      if (lockedRef.current) return

      seqIndex = (seqIndex + 1) % SPIN_SEQUENCE.length
      setDisplayItem(SPIN_SEQUENCE[seqIndex])

      const delay = getFrameDelay(elapsed)
      frameRef.current = setTimeout(tick, delay)
    }

    frameRef.current = setTimeout(tick, 80)

    return () => {
      if (frameRef.current) clearTimeout(frameRef.current)
    }
  }, [])

  const isHighValue = displayItem.id === 'legendary' || displayItem.id === 'mythic'

  return (
    <div
      className="flex items-center justify-center rounded-xl overflow-hidden relative"
      style={{
        width: 96,
        height: 96,
        background: locked
          ? `radial-gradient(ellipse at center, ${target.color}22 0%, rgba(0,0,0,0.6) 100%)`
          : 'rgba(255,255,255,0.05)',
        border: locked
          ? `1px solid ${target.color}66`
          : '1px solid rgba(255,255,255,0.1)',
        transition: 'background 0.3s, border-color 0.3s',
        boxShadow: locked ? `0 0 20px ${target.color}33` : 'none',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={displayItem.id + displayItem.value + (locked ? '-locked' : '')}
          initial={{ y: locked ? 0 : -24, opacity: 0, scale: locked ? 0.8 : 0.9 }}
          animate={{ y: 0, opacity: 1, scale: locked ? 1.05 : 1 }}
          exit={{ y: locked ? 0 : 24, opacity: 0 }}
          transition={locked
            ? { type: 'spring', stiffness: 600, damping: 18 }
            : { duration: 0.06 }
          }
          className="font-display font-bold text-center select-none"
          style={{
            fontSize: displayItem.value.length > 3 ? 28 : 32,
            color: displayItem.color,
            textShadow: isHighValue || locked
              ? `0 0 20px ${displayItem.color}99, 0 0 40px ${displayItem.color}44`
              : 'none',
          }}
        >
          {displayItem.value}
        </motion.div>
      </AnimatePresence>

      {/* Lock flash */}
      {locked && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{ background: target.color, mixBlendMode: 'screen' }}
        />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function SlotMachine() {
  const slotMachine = useTaskStore(s => s.ui.slotMachine)
  const dismissSlotMachine = useTaskStore(s => s.dismissSlotMachine)
  const soundEnabled = useTaskStore(s => s.settings.soundEnabled)

  if (!slotMachine) return null

  const tier = MULTIPLIER_TIERS.find(t => t.id === slotMachine.tier) ?? MULTIPLIER_TIERS[0]

  return (
    <SlotMachineInner
      key={slotMachine.taskId}
      slotMachine={slotMachine}
      tier={tier}
      soundEnabled={soundEnabled}
      dismissSlotMachine={dismissSlotMachine}
    />
  )
}

function SlotMachineInner({ slotMachine, tier, soundEnabled, dismissSlotMachine }) {
  const totalDuration = TIER_DURATION[tier.id]
  const holdDuration = TIER_HOLD[tier.id]

  // Reel lock times — staggered, each locks sequentially
  // Last reel locks at 85% of total duration
  const lockAt = [
    totalDuration * 0.40,
    totalDuration * 0.62,
    totalDuration * 0.82,
  ]

  const [reelsLocked, setReelsLocked] = useState([false, false, false])
  const [phase, setPhase] = useState('spinning') // spinning | result

  // Track reel lock events for sound + phase transition
  useEffect(() => {
    const timers = lockAt.map((t, i) =>
      setTimeout(() => {
        if (soundEnabled) playSlotLock()
        setReelsLocked(prev => {
          const next = [...prev]
          next[i] = true
          return next
        })
      }, t + 800) // +800ms to fire after both near-miss frames (400ms × 2)
    )

    // Transition to result phase after last reel locks + near-miss delay
    const resultTimer = setTimeout(() => {
      setPhase('result')
      if (soundEnabled) {
        const fn = TIER_RESULT_SOUNDS[tier.id]
        if (fn) fn()
      }
    }, lockAt[2] + 900)

    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(resultTimer)
    }
  }, [])

  // Auto-dismiss after hold
  useEffect(() => {
    if (phase !== 'result') return
    const timer = setTimeout(dismissSlotMachine, holdDuration)
    return () => clearTimeout(timer)
  }, [phase])

  const flashConfig = {
    common:    { opacity: 0 },
    rare:      { color: tier.color, opacity: 0.10 },
    epic:      { color: tier.color, opacity: 0.16 },
    legendary: { color: tier.color, opacity: 0.22 },
    mythic:    { rainbow: true,     opacity: 0.28 },
  }[tier.id]

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ zIndex: 60 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/88" />

      {/* Screen flash on result */}
      <AnimatePresence>
        {phase === 'result' && flashConfig.opacity > 0 && (
          <motion.div
            key="flash"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: flashConfig.rainbow
                ? 'conic-gradient(from 0deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #8B00FF, #FF0000)'
                : tier.color,
              mixBlendMode: 'screen',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, flashConfig.opacity, flashConfig.opacity * 0.3] }}
            transition={{ duration: 1.0, times: [0, 0.15, 1] }}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">

        {/* Task name */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 0.45, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-xs text-white font-sans truncate max-w-[240px] text-center tracking-wide"
        >
          {slotMachine.taskText}
        </motion.div>

        {/* Reels */}
        <div className="flex gap-3">
          {[0, 1, 2].map(i => (
            <Reel
              key={i}
              reelIndex={i}
              targetTierId={slotMachine.tier}
              lockAt={lockAt[i]}
              totalDuration={totalDuration}
            />
          ))}
        </div>

        {/* Result */}
        <div style={{ minHeight: 80 }} className="flex items-center justify-center">
          <AnimatePresence>
            {phase === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 480, damping: 20 }}
                className="text-center"
              >
                <div
                  className="font-display font-bold tracking-tight"
                  style={{
                    fontSize: 52,
                    color: tier.color,
                    textShadow: `0 0 30px ${tier.color}99, 0 0 60px ${tier.color}44`,
                    lineHeight: 1,
                  }}
                >
                  +{slotMachine.xpAmount.toLocaleString()} XP
                </div>
                <div
                  className="font-sans font-semibold mt-2 tracking-widest uppercase"
                  style={{ fontSize: 13, color: tier.color, opacity: 0.75 }}
                >
                  {tier.label} · {tier.value}x
                </div>
              </motion.div>
            )}

            {/* Spinning dots placeholder */}
            {phase === 'spinning' && (
              <motion.div
                key="dots"
                className="flex gap-2"
                exit={{ opacity: 0 }}
              >
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                    animate={{ opacity: [0.25, 0.8, 0.25] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  )
}
