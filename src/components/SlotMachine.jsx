import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { MULTIPLIER_TIERS } from '@/utils/progression'
import {
  playSlotEntrance,
  playSlotLock,
  playSlotResultCommon,
  playSlotResultRare,
  playSlotResultEpic,
  playSlotResultLegendary,
  playSlotResultMythic,
} from '@/hooks/useSound'

// ── Layout constants ───────────────────────────────────────────────────────
const ITEM_W    = 82          // card width px
const ITEM_H    = 82          // card height px
const ITEM_GAP  = 6           // gap between cards px
const ITEM_STEP = ITEM_W + ITEM_GAP  // 88px per slot
const VISIBLE   = 7           // visible items (odd for symmetry)
const CONTAINER_W = ITEM_STEP * VISIBLE - ITEM_GAP  // 610px

// The winner lives at this fixed index in the strip
const WIN_INDEX = 38

// Delay before spin starts (matches the container animate-in timing)
const ENTRANCE_DELAY = 900  // ms

// ── Tier config ────────────────────────────────────────────────────────────
const TIER_DURATION = {
  common:    3000,
  rare:      3200,
  epic:      3400,
  legendary: 3800,
  mythic:    4200,
}

const TIER_HOLD = {
  common:    1500,
  rare:      2200,
  epic:      3200,
  legendary: 5000,
  mythic:    7000,
}

const TIER_RESULT_SOUNDS = {
  common:    playSlotResultCommon,
  rare:      playSlotResultRare,
  epic:      playSlotResultEpic,
  legendary: playSlotResultLegendary,
  mythic:    playSlotResultMythic,
}

// ── Item pool shown during the spin ───────────────────────────────────────
// High-value items appear frequently so the near-miss feel is strong
const SPIN_SEQUENCE = [
  { id: 'common',    value: '1x',   color: '#888888' },
  { id: 'rare',      value: '1.5x', color: '#4A9EFF' },
  { id: 'common',    value: '1x',   color: '#888888' },
  { id: 'epic',      value: '2x',   color: '#9B59B6' },
  { id: 'rare',      value: '1.5x', color: '#4A9EFF' },
  { id: 'legendary', value: '3.5x', color: '#FFD700' },
  { id: 'common',    value: '1x',   color: '#888888' },
  { id: 'rare',      value: '1.5x', color: '#4A9EFF' },
  { id: 'epic',      value: '2x',   color: '#9B59B6' },
  { id: 'legendary', value: '3.5x', color: '#FFD700' },
  { id: 'mythic',    value: '10x',  color: '#FF3030' },
  { id: 'common',    value: '1x',   color: '#888888' },
]

function tierToDisplayItem(t) {
  const valueMap = { 1: '1x', 1.5: '1.5x', 2: '2x', 3.5: '3.5x', 10: '10x' }
  return { id: t.id, value: valueMap[t.value] ?? `${t.value}x`, color: t.color }
}

function getTierByOffset(targetId, offset) {
  const idx = MULTIPLIER_TIERS.findIndex(t => t.id === targetId)
  return MULTIPLIER_TIERS[Math.max(0, Math.min(idx + offset, MULTIPLIER_TIERS.length - 1))]
}

// Generate the horizontal strip:
// – Random items fill most of the pre-winner space
// – Two near-miss items (one tier above winner) sit just before the winner
//   so the strip naturally slows past them before settling
// – A few filler items follow the winner so the strip doesn't dead-end
function generateStrip(winningTierId) {
  const winTier  = MULTIPLIER_TIERS.find(t => t.id === winningTierId)
  const winner   = tierToDisplayItem(winTier)
  const nearMiss = tierToDisplayItem(getTierByOffset(winningTierId, +1))
  const startOff = Math.floor(Math.random() * SPIN_SEQUENCE.length)

  const items = []
  for (let i = 0; i < WIN_INDEX - 2; i++) {
    items.push(SPIN_SEQUENCE[(startOff + i) % SPIN_SEQUENCE.length])
  }
  items.push(nearMiss)  // WIN_INDEX - 2 │ near-miss frame 1
  items.push(nearMiss)  // WIN_INDEX - 1 │ near-miss frame 2
  items.push(winner)    // WIN_INDEX     │ the actual winner
  for (let i = 0; i < 4; i++) {
    items.push(SPIN_SEQUENCE[(startOff + i) % SPIN_SEQUENCE.length])
  }
  return items
}

// ── Single horizontal crate reel ──────────────────────────────────────────
function CrateReel({ landingTierId, totalDuration, onLocked }) {
  const stripRef    = useRef(null)
  const [locked, setLocked] = useState(false)
  const strip       = useMemo(() => generateStrip(landingTierId), [landingTierId])
  const landingTier = MULTIPLIER_TIERS.find(t => t.id === landingTierId)

  // translateX that puts the WIN_INDEX card exactly in the center
  const finalX = CONTAINER_W / 2 - (WIN_INDEX * ITEM_STEP + ITEM_W / 2)

  useEffect(() => {
    const el = stripRef.current
    if (!el) return

    let startTimer, lockTimer

    startTimer = setTimeout(() => {
      // Set explicit start state → force reflow → add transition → set end state
      el.style.transform = 'translateX(0)'
      void el.getBoundingClientRect()
      el.style.transition = `transform ${totalDuration}ms cubic-bezier(0.12, 0.82, 0.2, 1)`
      el.style.transform  = `translateX(${finalX}px)`
    }, ENTRANCE_DELAY)

    lockTimer = setTimeout(() => {
      setLocked(true)
      onLocked?.()
    }, ENTRANCE_DELAY + totalDuration)

    return () => {
      clearTimeout(startTimer)
      clearTimeout(lockTimer)
    }
  }, [])

  return (
    <div
      style={{
        width: CONTAINER_W,
        height: ITEM_H + 24,  // 12px above + 12px below for indicator arrows
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 14,
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Top indicator arrow — points down toward the center line */}
      <div
        style={{
          position: 'absolute', left: '50%', top: 0, zIndex: 20,
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: '11px solid rgba(255,255,255,0.85)',
        }}
      />

      {/* Bottom indicator arrow — points up toward the center line */}
      <div
        style={{
          position: 'absolute', left: '50%', bottom: 0, zIndex: 20,
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderBottom: '11px solid rgba(255,255,255,0.85)',
        }}
      />

      {/* Scrolling item strip */}
      <div
        ref={stripRef}
        style={{
          display: 'flex',
          gap: ITEM_GAP,
          position: 'absolute',
          top: 12,
          left: 0,
          willChange: 'transform',
        }}
      >
        {strip.map((item, i) => (
          <div
            key={i}
            style={{
              width: ITEM_W,
              height: ITEM_H,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              background: `linear-gradient(135deg, ${item.color}18 0%, rgba(0,0,0,0.5) 100%)`,
              border: `1px solid ${item.color}40`,
            }}
          >
            <span
              style={{
                color: item.color,
                fontWeight: 700,
                fontSize: item.value.length > 3 ? 20 : 24,
                fontFamily: 'var(--font-display, sans-serif)',
                textShadow: (item.id === 'legendary' || item.id === 'mythic')
                  ? `0 0 12px ${item.color}88`
                  : 'none',
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Left vignette */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 110, zIndex: 10, pointerEvents: 'none',
          background: 'linear-gradient(to right, rgba(0,0,0,0.88) 0%, transparent 100%)',
        }}
      />

      {/* Right vignette */}
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: 110, zIndex: 10, pointerEvents: 'none',
          background: 'linear-gradient(to left, rgba(0,0,0,0.88) 0%, transparent 100%)',
        }}
      />

      {/* Winner highlight border — fades in when the strip locks */}
      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              left: '50%',
              top: 12,
              width: ITEM_W,
              height: ITEM_H,
              transform: 'translateX(-50%)',
              border: `2px solid ${landingTier.color}`,
              borderRadius: 10,
              boxShadow: `0 0 28px ${landingTier.color}88, inset 0 0 16px ${landingTier.color}22`,
              zIndex: 15,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SlotMachine() {
  const slotMachine       = useTaskStore(s => s.ui.slotMachine)
  const dismissSlotMachine = useTaskStore(s => s.dismissSlotMachine)
  const soundEnabled      = useTaskStore(s => s.settings.soundEnabled)

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
  const holdDuration  = TIER_HOLD[tier.id]
  const [phase, setPhase] = useState('spinning')  // 'spinning' | 'result'

  const handleLocked = useCallback(() => {
    if (soundEnabled) playSlotLock()
    setTimeout(() => {
      setPhase('result')
      if (soundEnabled) {
        const fn = TIER_RESULT_SOUNDS[tier.id]
        if (fn) fn()
      }
    }, 300)
  }, [soundEnabled, tier.id])

  // Entrance sound
  useEffect(() => {
    if (soundEnabled) playSlotEntrance()
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
      className="fixed inset-0"
      style={{ zIndex: 200 }}
      initial={false}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
    >
      {/* Layer 1: dark backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/88"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ willChange: 'opacity' }}
      />

      {/* Layer 2: frosted glass */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 40% 20%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.028) 50%, rgba(0,0,0,0.154) 100%)',
          backdropFilter: 'blur(28px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
          willChange: 'opacity',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />

      {/* Layer 3: screen flash on result */}
      <AnimatePresence>
        {phase === 'result' && flashConfig.opacity > 0 && (
          <motion.div
            key="flash"
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 1,
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

      {/* Layer 4: content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-8"
        style={{ zIndex: 2 }}
      >
        {/* Task name */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 0.55, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: 'easeOut' }}
          className="text-xs text-white font-sans truncate max-w-[280px] text-center tracking-wide"
        >
          {slotMachine.taskText}
        </motion.div>

        {/* Horizontal crate reel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <CrateReel
            landingTierId={tier.id}
            totalDuration={totalDuration}
            onLocked={handleLocked}
          />
        </motion.div>

        {/* Result area */}
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
