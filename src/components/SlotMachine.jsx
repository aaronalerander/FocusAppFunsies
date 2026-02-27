import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { MULTIPLIER_TIERS } from '@/utils/progression'
import { fireTier } from '@/components/Confetti'
import {
  playSlotEntrance,
  playSlotLock,
  playSlotResultCommon,
  playSlotResultRare,
  playSlotResultEpic,
  playSlotResultLegendary,
  playSlotResultMythic,
} from '@/hooks/useSound'

// ── Strip constants (dimension-independent) ────────────────────────────────
const WIN_INDEX      = 45   // winner sits at this index in the strip
const ENTRANCE_DELAY = 900  // ms — matches container fade-in

// ── Logarithmic ease-out ──────────────────────────────────────────────────
//
// f(t) = ln(1 + k·t) / ln(1 + k)
//
// A single smooth curve — no phase boundary, no abrupt gear-change.
// The strip launches at ~7× the average speed and decelerates continuously,
// letting the last items tick past one-by-one as the curve flattens to near-zero.
//
// k = 22  →  start/end speed ratio ≈ 23:1
//   common  (5 s): ~370 ms per near-miss item  (conscious registration range)
//   mythic  (13 s): ~960 ms per near-miss item  (agonising crawl)
//
const LOG_K = 22

function easeProgress(t) {
  return Math.log(1 + LOG_K * t) / Math.log(1 + LOG_K)
}

// ── Timing ─────────────────────────────────────────────────────────────────
const TIER_DURATION = {
  common:    5000,
  rare:      6500,
  epic:      8000,
  legendary: 10000,
  mythic:    13000,
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

// ── Item pool ──────────────────────────────────────────────────────────────
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

// ── Strip generation ───────────────────────────────────────────────────────
//  0–26 : random blur
// 27–30 : excitement tease (2 tiers above winner) — adrenaline spike mid-spin
// 31–40 : random filler   (31–35 fast, 36–40 enter slow zone)
// 41–44 : near-miss ×4    (1 tier above winner — dwell in center one by one)
//    45 : winner
// 46–49 : post-filler
function generateStrip(winningTierId) {
  const winTier  = MULTIPLIER_TIERS.find(t => t.id === winningTierId)
  const winner   = tierToDisplayItem(winTier)
  const nearMiss = tierToDisplayItem(getTierByOffset(winningTierId, +1))
  const tease    = tierToDisplayItem(getTierByOffset(winningTierId, +2))
  const startOff = Math.floor(Math.random() * SPIN_SEQUENCE.length)

  const items = []
  for (let i = 0; i < 27; i++) items.push(SPIN_SEQUENCE[(startOff + i) % SPIN_SEQUENCE.length])
  for (let i = 0; i < 4;  i++) items.push(tease)
  for (let i = 0; i < 10; i++) items.push(SPIN_SEQUENCE[(startOff + 27 + i) % SPIN_SEQUENCE.length])
  for (let i = 0; i < 4;  i++) items.push(nearMiss)
  items.push(winner)
  for (let i = 0; i < 4;  i++) items.push(SPIN_SEQUENCE[(startOff + i) % SPIN_SEQUENCE.length])
  return items
}

// ── Crate reel ─────────────────────────────────────────────────────────────
function CrateReel({ landingTierId, totalDuration, onLocked }) {
  const stripRef      = useRef(null)
  const selectorRef   = useRef(null)   // near-miss glow — direct DOM
  const animFrameRef  = useRef(null)
  const [locked, setLocked] = useState(false)

  const strip        = useMemo(() => generateStrip(landingTierId), [landingTierId])
  const landingTier  = MULTIPLIER_TIERS.find(t => t.id === landingTierId)
  const nearMissTier = getTierByOffset(landingTierId, +1)

  // ── Viewport-relative dimensions, computed once at mount ─────────────────
  // Cards are tall portrait slabs that take up ~65% of screen height.
  // The strip spans the full viewport width for a cinematic edge-to-edge feel.
  const dims = useMemo(() => {
    const itemH    = Math.min(Math.round(window.innerHeight * 0.65), 500)
    const itemW    = Math.round(itemH * 0.36)   // ~1:2.78 portrait ratio
    const gap      = 10
    const step     = itemW + gap
    const cw       = window.innerWidth           // full-width container
    const arrowSz  = Math.max(12, Math.round(itemH * 0.026))
    const vigW     = Math.min(Math.round(cw * 0.18), 230)
    const valFont  = Math.round(itemH * 0.17)
    const lblFont  = Math.max(11, Math.round(itemH * 0.031))
    return { itemH, itemW, gap, step, cw, arrowSz, vigW, valFont, lblFont }
  }, [])

  const { itemH, itemW, gap, step, cw, arrowSz, vigW, valFont, lblFont } = dims

  // translateX that places WIN_INDEX card exactly in the viewport center
  const finalX = cw / 2 - (WIN_INDEX * step + itemW / 2)

  // Scale value font down for longer strings so text fits the card width
  function getValFontSize(value) {
    if (value.length <= 2) return valFont
    if (value.length === 3) return Math.round(valFont * 0.82)
    return Math.round(valFont * 0.65)   // 4 chars: "1.5x", "3.5x"
  }

  useEffect(() => {
    const el = stripRef.current
    if (!el) return

    const startTimer = setTimeout(() => {
      const startTime = performance.now()

      function tick(now) {
        const elapsed = now - startTime
        const t       = Math.min(elapsed / totalDuration, 1)
        const frac    = easeProgress(t)
        const currentX = finalX * frac

        el.style.transform = `translateX(${currentX}px)`

        // During slow phase: light up the selector when a near-miss fills the center
        // Show near-miss glow whenever items are slow enough to read (~45 % onward)
        if (t > 0.45 && selectorRef.current) {
          const centerIdx  = Math.round((cw / 2 - itemW / 2 - currentX) / step)
          const idx        = Math.max(0, Math.min(centerIdx, strip.length - 1))
          const centerItem = strip[idx]
          const isNearMiss = centerItem &&
            centerItem.id === nearMissTier.id &&
            centerItem.id !== landingTierId

          const sel = selectorRef.current
          if (isNearMiss) {
            sel.style.borderColor = centerItem.color + 'ee'
            sel.style.boxShadow   =
              `0 0 0 2px ${centerItem.color}44, ` +
              `0 0 40px ${centerItem.color}88, ` +
              `inset 0 0 30px ${centerItem.color}22`
            sel.style.opacity = '1'
          } else {
            sel.style.borderColor = 'rgba(255,255,255,0.2)'
            sel.style.boxShadow   = 'none'
            sel.style.opacity     = '1'   // always visible — shows landing zone
          }
        }

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(tick)
        } else {
          el.style.transform = `translateX(${finalX}px)`
          setLocked(true)
          onLocked?.()
        }
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }, ENTRANCE_DELAY)

    return () => {
      clearTimeout(startTimer)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return (
    <div
      style={{
        width: cw,
        height: itemH + arrowSz * 2 + 4,
        overflow: 'hidden',
        position: 'relative',
        background: 'rgba(0,0,0,0.3)',
      }}
    >
      {/* Top indicator arrow */}
      <div style={{
        position: 'absolute', left: '50%', top: 0, zIndex: 30,
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft:  `${arrowSz * 0.7}px solid transparent`,
        borderRight: `${arrowSz * 0.7}px solid transparent`,
        borderTop:   `${arrowSz}px solid rgba(255,255,255,0.9)`,
      }} />

      {/* Bottom indicator arrow */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 0, zIndex: 30,
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft:  `${arrowSz * 0.7}px solid transparent`,
        borderRight: `${arrowSz * 0.7}px solid transparent`,
        borderBottom: `${arrowSz}px solid rgba(255,255,255,0.9)`,
      }} />

      {/* Scrolling strip */}
      <div
        ref={stripRef}
        style={{
          display: 'flex',
          gap,
          position: 'absolute',
          top: arrowSz + 2,
          left: 0,
          willChange: 'transform',
        }}
      >
        {strip.map((item, i) => {
          const label = MULTIPLIER_TIERS.find(t => t.id === item.id)?.label ?? item.id
          const isHigh = item.id === 'legendary' || item.id === 'mythic'
          return (
            <div
              key={i}
              style={{
                width: itemW,
                height: itemH,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: Math.round(itemH * 0.035),
                borderRadius: 14,
                background: `linear-gradient(170deg,
                  ${item.color}28 0%,
                  ${item.color}0a 35%,
                  rgba(0,0,0,0.7) 100%)`,
                border: `1px solid ${item.color}55`,
              }}
            >
              <span
                style={{
                  color: item.color,
                  fontWeight: 900,
                  fontSize: getValFontSize(item.value),
                  fontFamily: 'var(--font-display, sans-serif)',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  textShadow: isHigh
                    ? `0 0 24px ${item.color}cc, 0 0 60px ${item.color}55`
                    : `0 0 12px ${item.color}66`,
                }}
              >
                {item.value}
              </span>
              <span
                style={{
                  color: item.color,
                  fontWeight: 600,
                  fontSize: lblFont,
                  fontFamily: 'var(--font-sans, sans-serif)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  opacity: 0.65,
                }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Always-visible landing-zone selector + near-miss glow */}
      <div
        ref={selectorRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: arrowSz + 2,
          width: itemW,
          height: itemH,
          transform: 'translateX(-50%)',
          border: '2px solid rgba(255,255,255,0.2)',
          borderRadius: 14,
          zIndex: 20,
          pointerEvents: 'none',
          opacity: 0,   // hidden until spin starts (RAF sets it to 1 in slow phase)
          transition: 'border-color 0.07s, box-shadow 0.07s',
        }}
      />

      {/* Winner highlight — fades in on lock */}
      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            style={{
              position: 'absolute',
              left: '50%',
              top: arrowSz + 2,
              width: itemW,
              height: itemH,
              transform: 'translateX(-50%)',
              border: `3px solid ${landingTier.color}`,
              borderRadius: 14,
              boxShadow:
                `0 0 0 1px ${landingTier.color}44, ` +
                `0 0 50px ${landingTier.color}aa, ` +
                `0 0 120px ${landingTier.color}44, ` +
                `inset 0 0 40px ${landingTier.color}22`,
              zIndex: 22,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Left vignette */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: vigW, zIndex: 25, pointerEvents: 'none',
        background: 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
      }} />

      {/* Right vignette */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: vigW, zIndex: 25, pointerEvents: 'none',
        background: 'linear-gradient(to left, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
      }} />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SlotMachine() {
  const slotMachine        = useTaskStore(s => s.ui.slotMachine)
  const dismissSlotMachine = useTaskStore(s => s.dismissSlotMachine)
  const soundEnabled       = useTaskStore(s => s.settings.soundEnabled)

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
    // Confetti fires the instant the reel stops — maximum payoff impact
    fireTier(tier.id, slotMachine.isFreeXP)
    setTimeout(() => {
      setPhase('result')
      if (soundEnabled) {
        const fn = TIER_RESULT_SOUNDS[tier.id]
        if (fn) fn()
      }
    }, 300)
  }, [soundEnabled, tier.id, slotMachine.isFreeXP])

  useEffect(() => {
    if (soundEnabled) playSlotEntrance()
  }, [])

  useEffect(() => {
    if (phase !== 'result') return
    const t = setTimeout(dismissSlotMachine, holdDuration)
    return () => clearTimeout(t)
  }, [phase])

  const flashConfig = {
    common:    { opacity: 0 },
    rare:      { color: tier.color, opacity: 0.10 },
    epic:      { color: tier.color, opacity: 0.16 },
    legendary: { color: tier.color, opacity: 0.24 },
    mythic:    { rainbow: true,     opacity: 0.30 },
  }[tier.id]

  return (
    <motion.div
      className="fixed inset-0"
      style={{ zIndex: 200 }}
      initial={false}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
    >
      {/* Layer 1: OLED black backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{ background: '#050508' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Layer 2: frosted glass texture */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.2) 100%)',
          backdropFilter: 'blur(32px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />

      {/* Layer 3: tier ambient glow behind the reel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 40% at 50% 50%, ${tier.color}12 0%, transparent 70%)`,
          zIndex: 1,
        }}
      />

      {/* Layer 4: screen flash on result */}
      <AnimatePresence>
        {phase === 'result' && flashConfig.opacity > 0 && (
          <motion.div
            key="flash"
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 2,
              background: flashConfig.rainbow
                ? 'conic-gradient(from 0deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #8B00FF, #FF0000)'
                : tier.color,
              mixBlendMode: 'screen',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, flashConfig.opacity, flashConfig.opacity * 0.25] }}
            transition={{ duration: 1.2, times: [0, 0.12, 1] }}
          />
        )}
      </AnimatePresence>

      {/* Layer 5: content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ zIndex: 3, gap: '20px' }}
      >
        {/* Task name */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 0.5, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: 'easeOut' }}
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'var(--font-sans, sans-serif)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            maxWidth: 320,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {slotMachine.taskText}
        </motion.div>

        {/* The reel — enters scaled from 0.96 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%' }}
        >
          <CrateReel
            landingTierId={tier.id}
            totalDuration={totalDuration}
            onLocked={handleLocked}
          />
        </motion.div>

        {/* Result / spinner */}
        <div style={{ minHeight: 88, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatePresence>
            {phase === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.45, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                style={{ textAlign: 'center' }}
              >
                <div
                  style={{
                    fontSize: 64,
                    fontWeight: 900,
                    fontFamily: 'var(--font-display, sans-serif)',
                    color: tier.color,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    textShadow: `0 0 40px ${tier.color}99, 0 0 80px ${tier.color}44`,
                  }}
                >
                  +{slotMachine.xpAmount.toLocaleString()} XP
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontFamily: 'var(--font-sans, sans-serif)',
                    fontWeight: 600,
                    marginTop: 10,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: tier.color,
                    opacity: 0.7,
                  }}
                >
                  {tier.label} · {tier.value}x multiplier
                </div>
              </motion.div>
            )}

            {phase === 'spinning' && (
              <motion.div
                key="dots"
                style={{ display: 'flex', gap: 8 }}
                exit={{ opacity: 0 }}
              >
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    }}
                    animate={{ opacity: [0.2, 0.7, 0.2] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
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
