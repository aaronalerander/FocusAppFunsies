import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confettiLib from 'canvas-confetti'
import useTaskStore from '@/store/tasks'
import { getRankById, RANK_COLORS } from '@/utils/progression'
import { playRankUp } from '@/hooks/useSound'

// ── Rank Icons (mirrored from RankDisplay, rendered at larger size) ────────

function BronzeIcon({ color }) {
  return (
    <g>
      <path d="M20 4 L34 10 L34 24 Q34 34 20 38 Q6 34 6 24 L6 10 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 7 L31 12 L31 24 Q31 31 20 35 Q9 31 9 24 L9 12 Z" fill={color} opacity="0.15" />
      <path d="M13 19 L20 15 L27 19 L27 25 L20 29 L13 25 Z" fill={color} opacity="0.5" />
    </g>
  )
}

function SilverIcon({ color }) {
  return (
    <g>
      <path d="M20 3 L35 10 L35 25 Q35 35 20 39 Q5 35 5 25 L5 10 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 3 L35 10 L35 25 Q35 35 20 39 Q5 35 5 25 L5 10 Z" fill={color} opacity="0.12" />
      <path d="M5 14 L1 18 L5 22" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 14 L39 18 L35 22" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 14 L25 20 L20 26 L15 20 Z" fill={color} opacity="0.7" />
    </g>
  )
}

function GoldIcon({ color }) {
  return (
    <g>
      <path d="M8 11 L12 5 L20 10 L28 5 L32 11" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11 L32 11 L32 26 Q32 36 20 40 Q8 36 8 26 Z" fill={color} opacity="0.15" strokeLinejoin="round" />
      <path d="M8 11 L32 11 L32 26 Q32 36 20 40 Q8 36 8 26 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 16 L21.8 21.5 L27.5 21.5 L22.9 24.8 L24.7 30.3 L20 27 L15.3 30.3 L17.1 24.8 L12.5 21.5 L18.2 21.5 Z" fill={color} opacity="0.75" />
    </g>
  )
}

function PlatinumIcon({ color }) {
  return (
    <g>
      <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 6 L33 13 L33 27 L20 34 L7 27 L7 13 Z" fill={color} opacity="0.12" />
      <line x1="10" y1="15" x2="30" y2="25" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <line x1="30" y1="15" x2="10" y2="25" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <circle cx="20" cy="20" r="5" fill={color} opacity="0.65" />
      <circle cx="20" cy="20" r="3" fill="none" stroke={color} strokeWidth="1.5" />
    </g>
  )
}

function DiamondIcon({ color }) {
  return (
    <g>
      <path d="M20 2 L38 20 L20 38 L2 20 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 2 L38 20 L20 38 L2 20 Z" fill={color} opacity="0.1" />
      <line x1="20" y1="2" x2="9" y2="17" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="20" y1="2" x2="31" y2="17" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="20" y1="38" x2="9" y2="23" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="20" y1="38" x2="31" y2="23" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="2" y1="20" x2="38" y2="20" stroke={color} strokeWidth="1" opacity="0.35" />
      <path d="M20 12 L28 20 L20 28 L12 20 Z" fill={color} opacity="0.6" />
    </g>
  )
}

function MasterIcon({ color }) {
  return (
    <g>
      <path d="M20 20 L4 12 L2 20 L4 28 Z" fill={color} opacity="0.5" strokeLinejoin="round" />
      <path d="M20 20 L36 12 L38 20 L36 28 Z" fill={color} opacity="0.5" strokeLinejoin="round" />
      <path d="M20 20 L14 4 L20 8 L26 4 Z" fill={color} opacity="0.5" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="8" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="20" cy="20" r="5" fill={color} opacity="0.7" />
      <path d="M20 20 L4 12 L2 20 L4 28 Z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 20 L36 12 L38 20 L36 28 Z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 20 L14 4 L20 8 L26 4 Z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  )
}

function PredatorIcon({ color }) {
  return (
    <g>
      <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
      <path d="M20 4 L23 13 L29 6 L26 16 L36 13 L28 20 L36 27 L26 24 L29 34 L20 28 L11 34 L14 24 L4 27 L12 20 L4 13 L14 16 L11 6 L17 13 Z" fill={color} opacity="0.5" strokeLinejoin="round" />
      <path d="M20 4 L23 13 L29 6 L26 16 L36 13 L28 20 L36 27 L26 24 L29 34 L20 28 L11 34 L14 24 L4 27 L12 20 L4 13 L14 16 L11 6 L17 13 Z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="16" cy="18" r="2.5" fill={color} />
      <circle cx="24" cy="18" r="2.5" fill={color} />
      <path d="M17 24 L20 28 L23 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

const TIER_ICONS = {
  bronze: BronzeIcon,
  silver: SilverIcon,
  gold: GoldIcon,
  platinum: PlatinumIcon,
  diamond: DiamondIcon,
  master: MasterIcon,
  predator: PredatorIcon,
}

function RankIcon({ tier, color, size = 80 }) {
  const Icon = TIER_ICONS[tier] || BronzeIcon
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block' }}>
      <Icon color={color} />
    </svg>
  )
}

// ── Tier order for major/minor detection ───────────────────────────────────
const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'predator']

function isMajorPromotion(fromRank, toRank) {
  return TIER_ORDER.indexOf(toRank.tier) > TIER_ORDER.indexOf(fromRank.tier)
}

// ── Animation phases ───────────────────────────────────────────────────────
// 'anticipation' → 'transform' → 'reveal'
// Anticipation: from-icon shakes, pulses, builds tension
// Transform: from-icon shatters/dissolves away
// Reveal: to-icon slams in, confetti, fanfare

export default function RankUpAnimation() {
  const rankUpAnimation = useTaskStore(s => s.ui.rankUpAnimation)
  const dismissRankUpAnimation = useTaskStore(s => s.dismissRankUpAnimation)
  const soundEnabled = useTaskStore(s => s.settings.soundEnabled)
  const firedRef = useRef(false)
  const canvasRef = useRef(null)
  const [phase, setPhase] = useState('anticipation') // 'anticipation' | 'transform' | 'reveal'

  // Keep a snapshot of the last non-null rankUpAnimation so we can still render
  // during the exit animation after the store has been cleared.
  const snapshotRef = useRef(null)
  if (rankUpAnimation) snapshotRef.current = rankUpAnimation
  const data = snapshotRef.current

  const fromRank = data ? getRankById(data.fromRankId) : null
  const toRank   = data ? getRankById(data.toRankId) : null
  const isMajor  = fromRank && toRank ? isMajorPromotion(fromRank, toRank) : false

  const fromColor = fromRank ? (RANK_COLORS[fromRank.tier]?.primary || '#888') : '#888'
  const toColor   = toRank   ? (RANK_COLORS[toRank.tier]?.primary  || '#888') : '#888'

  // Timing — major promotions get longer anticipation and more chaos
  const anticipationMs = isMajor ? 1400 : 900
  const transformMs    = isMajor ? 600  : 400

  useEffect(() => {
    if (!rankUpAnimation) {
      firedRef.current = false
      setPhase('anticipation')
      return
    }
    if (firedRef.current) return
    firedRef.current = true

    // Phase 1: anticipation — let the shake play
    const t1 = setTimeout(() => setPhase('transform'), anticipationMs)

    // Phase 2: transform — icon dissolves, then reveal
    const t2 = setTimeout(() => {
      setPhase('reveal')
      if (soundEnabled) playRankUp()

      // Fire confetti into the local canvas inside the overlay so it stays
      // behind the rank icon content but above the frosted glass layer.
      // Using a local canvas means it won't escape above z-[150].
      setTimeout(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const fire = confettiLib.create(canvas, { resize: true, useWorker: false })
        const colors = [toColor, '#FFD700', '#FF3CAC', '#00D4FF', '#C8F135', '#ffffff', '#FF6B6B']
        const scale = isMajor ? 3.0 : 1.0

        const sideBurst = (side, delay, count = 120) => setTimeout(() => fire({
          particleCount: Math.round(count * scale),
          angle: side === 'left' ? 60 : 120,
          spread: 55,
          origin: { x: side === 'left' ? 0 : 1, y: 0.55 },
          colors, ticks: 400, gravity: 0.85, startVelocity: 70, scalar: 1.1, decay: 0.93,
        }), delay)

        sideBurst('left',  0);   sideBurst('right', 60)
        sideBurst('left',  120); sideBurst('right', 180)
        sideBurst('left',  240); sideBurst('right', 300)
        sideBurst('left',  360); sideBurst('right', 420)

        setTimeout(() => fire({
          particleCount: Math.round(600 * scale), spread: 130,
          origin: { x: 0.5, y: 0.25 }, colors, ticks: 500,
          gravity: 0.65, startVelocity: 55, scalar: 1.4,
        }), 500)

        setTimeout(() => fire({ particleCount: Math.round(250 * scale), angle: 75,  spread: 40, origin: { x: 0.05, y: 0 }, colors, ticks: 450, gravity: 1.1, startVelocity: 45 }), 700)
        setTimeout(() => fire({ particleCount: Math.round(250 * scale), angle: 105, spread: 40, origin: { x: 0.95, y: 0 }, colors, ticks: 450, gravity: 1.1, startVelocity: 45 }), 820)

        setTimeout(() => fire({
          particleCount: Math.round(350 * scale), spread: 100,
          origin: { x: 0.5, y: 0.4 }, colors, ticks: 380,
          gravity: 0.9, startVelocity: 42, scalar: 1.2,
        }), 1100)

        sideBurst('left',  1400, 150); sideBurst('right', 1500, 150)
        sideBurst('left',  1600, 120); sideBurst('right', 1700, 120)

        setTimeout(() => fire({
          particleCount: Math.round(500 * scale), spread: 160,
          origin: { x: 0.5, y: 0.3 }, colors, ticks: 350,
          gravity: 1.1, startVelocity: 38, scalar: 1.0, decay: 0.91,
        }), 2000)
      }, 50) // small delay to ensure canvas is laid out
    }, anticipationMs + transformMs)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [rankUpAnimation])

  const ringCount = isMajor ? 5 : 3

  return (
      <motion.div
        className="fixed inset-0 z-[300] flex items-center justify-center cursor-pointer"
        initial={false}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        onClick={phase === 'reveal' ? dismissRankUpAnimation : undefined}
      >
        {/* Layer 1: dark backdrop — fast fade, no blur on this element */}
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)', willChange: 'opacity' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Layer 2: frosted glass overlay — slow separate fade so blur doesn't repaint during opacity animation */}
        <motion.div
          className="absolute inset-0"
          style={{
            backdropFilter: 'blur(28px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
            background: 'radial-gradient(ellipse at 40% 20%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.028) 50%, rgba(0,0,0,0.154) 100%)',
            willChange: 'opacity',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />

        {/* Layer 3: confetti canvas — sits above glass, below content; confetti fires into here */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%', zIndex: 5 }}
        />

        {/* Flash burst on reveal */}
        <AnimatePresence>
          {phase === 'reveal' && (
            <motion.div
              key="flash"
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: toColor, mixBlendMode: 'screen', zIndex: 6 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, isMajor ? 0.6 : 0.35, 0.1, isMajor ? 0.45 : 0.2, 0] }}
              transition={{ duration: isMajor ? 1.4 : 1.0, times: [0, 0.06, 0.2, 0.35, 1] }}
            />
          )}
        </AnimatePresence>

        {/* Expanding rings on reveal */}
        <AnimatePresence>
          {phase === 'reveal' && Array.from({ length: ringCount }, (_, i) => (
            <motion.div
              key={`ring-${i}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 100, height: 100,
                border: `${isMajor ? 2.5 : 1.5}px solid ${toColor}`,
                boxShadow: `0 0 ${isMajor ? 40 : 20}px ${toColor}88`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: isMajor ? 10 : 7, opacity: 0 }}
              transition={{ duration: isMajor ? 2.2 : 1.6, delay: i * (isMajor ? 0.12 : 0.1), ease: [0.15, 0, 0.5, 1] }}
            />
          ))}
        </AnimatePresence>

        {/* Glow halo — pulses during anticipation, shifts to toColor on reveal */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 260, height: 260,
            background: phase === 'reveal'
              ? `radial-gradient(circle, ${toColor}66 0%, transparent 70%)`
              : `radial-gradient(circle, ${fromColor}44 0%, transparent 70%)`,
          }}
          animate={phase === 'anticipation'
            ? { scale: [1, 1.15, 0.95, 1.2, 1], opacity: [0.5, 0.9, 0.6, 1, 0.7] }
            : phase === 'transform'
            ? { scale: 0.3, opacity: 0 }
            : { scale: [0.4, 1.4, 1.0], opacity: [0, 1, 0.55] }
          }
          transition={phase === 'anticipation'
            ? { duration: anticipationMs / 1000, ease: 'easeInOut' }
            : phase === 'transform'
            ? { duration: transformMs / 1000, ease: 'easeIn' }
            : { duration: 0.9, ease: 'easeOut' }
          }
        />

        {/* ── Icon stage ── */}
        <div className="relative z-10 flex flex-col items-center">

          {/* Icon container — shows from-icon during anticipation/transform, to-icon on reveal */}
          <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* FROM icon — visible during anticipation, shatters on transform */}
            <AnimatePresence>
              {phase !== 'reveal' && (
                <motion.div
                  key="from-icon"
                  style={{ position: 'absolute', filter: `drop-shadow(0 0 12px ${fromColor}cc)` }}
                  animate={phase === 'anticipation' ? {
                    // Shake + pulse — builds tension
                    x: isMajor
                      ? [0, -4, 4, -6, 6, -4, 4, -2, 2, 0]
                      : [0, -2, 2, -3, 3, -2, 2, 0],
                    scale: isMajor
                      ? [1, 1.05, 0.97, 1.08, 0.96, 1.06, 1.0]
                      : [1, 1.03, 0.98, 1.04, 1.0],
                    filter: [
                      `drop-shadow(0 0 8px ${fromColor}88)`,
                      `drop-shadow(0 0 24px ${fromColor}ff)`,
                      `drop-shadow(0 0 12px ${fromColor}cc)`,
                      `drop-shadow(0 0 30px ${fromColor}ff)`,
                      `drop-shadow(0 0 8px ${fromColor}88)`,
                    ],
                  } : {}}
                  exit={{
                    scale: [1, 1.3, 0],
                    opacity: [1, 1, 0],
                    rotate: isMajor ? [0, -15, 30] : [0, 10],
                    filter: `drop-shadow(0 0 40px ${fromColor}ff)`,
                  }}
                  transition={phase === 'anticipation'
                    ? { duration: anticipationMs / 1000, ease: 'easeInOut', times: isMajor ? [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1] : [0, 0.2, 0.4, 0.65, 1] }
                    : { duration: transformMs / 1000 * 0.8, ease: 'easeIn' }
                  }
                >
                  <RankIcon tier={fromRank.tier} color={fromColor} size={isMajor ? 100 : 90} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* TO icon — slams in on reveal */}
            <AnimatePresence>
              {phase === 'reveal' && (
                <motion.div
                  key="to-icon"
                  style={{ position: 'absolute' }}
                  initial={{ scale: 0, rotate: isMajor ? -25 : -12, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: isMajor ? 380 : 280, damping: 14 }}
                >
                  {/* Pulsing glow behind new icon */}
                  <motion.div
                    style={{
                      position: 'absolute', inset: -20,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${toColor}55 0%, transparent 70%)`,
                    }}
                    animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <RankIcon tier={toRank.tier} color={toColor} size={isMajor ? 110 : 96} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text — hidden during anticipation/transform to keep focus on icon */}
          <AnimatePresence>
            {phase === 'reveal' && (
              <motion.div
                key="text"
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {/* RANK UP label */}
                <motion.p
                  className="font-sans font-bold uppercase text-center"
                  style={{
                    color: toColor,
                    fontSize: isMajor ? 11 : 10,
                    letterSpacing: isMajor ? '0.35em' : '0.25em',
                    marginTop: 20,
                    marginBottom: 6,
                  }}
                  animate={{ opacity: [0.75, 1, 0.75] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {isMajor ? '✦ Rank Up ✦' : 'Rank Up'}
                </motion.p>

                {/* From → divider → To */}
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                  {fromRank.name}
                </p>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                  style={{ width: isMajor ? 32 : 16, height: 2, backgroundColor: toColor, opacity: 0.55, marginBottom: 4, borderRadius: 1 }}
                />
                <motion.h2
                  className="font-display font-bold tracking-wide text-center"
                  style={{ fontSize: isMajor ? 44 : 36, color: toColor, lineHeight: 1 }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.3 }}
                >
                  {toRank.name}
                </motion.h2>

                {/* New slot pill */}
                {data?.newSlots && (
                  <motion.div
                    className="mt-4 px-4 py-2 rounded-lg text-center"
                    style={{ background: `${toColor}22`, border: `1px solid ${toColor}44` }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <p className="text-xs font-sans font-semibold" style={{ color: toColor }}>
                      New slot unlocked — Today now holds {data.newSlots} tasks
                    </p>
                  </motion.div>
                )}

                {/* Dismiss hint */}
                <motion.p
                  className="font-sans text-white/30"
                  style={{ fontSize: 10, marginTop: 28 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                >
                  tap to continue
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Anticipation countdown text — "promoting..." only for major */}
          <AnimatePresence>
            {phase === 'anticipation' && isMajor && (
              <motion.p
                key="promoting"
                className="font-sans font-semibold uppercase"
                style={{ color: fromColor, fontSize: 10, letterSpacing: '0.3em', marginTop: 16, opacity: 0.6 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.4, 0.7, 0.5] }}
                exit={{ opacity: 0 }}
                transition={{ duration: anticipationMs / 1000, ease: 'easeInOut' }}
              >
                promoting...
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
  )
}
