import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { getRankById, getNextRank, getXPProgress, RANK_COLORS } from '@/utils/progression'
import { getResetTimestamp } from '@/utils/dateUtils'
import { playRankProximityTone } from '@/hooks/useSound'

const SIZE = 88
const STROKE = 5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// ── Rank Icons ────────────────────────────────────────────────────────
// Apex Legends-inspired SVG emblems, drawn in a 40×40 viewBox.
// Each icon is a stylized emblem with tier-specific geometry.

function BronzeIcon({ color }) {
  // Shield with simple horizontal bars — rough, entry-level feel
  return (
    <g>
      {/* Outer shield */}
      <path
        d="M20 4 L34 10 L34 24 Q34 34 20 38 Q6 34 6 24 L6 10 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner shield body fill */}
      <path
        d="M20 7 L31 12 L31 24 Q31 31 20 35 Q9 31 9 24 L9 12 Z"
        fill={color}
        opacity="0.15"
      />
      {/* Center notch */}
      <path
        d="M13 19 L20 15 L27 19 L27 25 L20 29 L13 25 Z"
        fill={color}
        opacity="0.5"
      />
    </g>
  )
}

function SilverIcon({ color }) {
  // Shield with angular wingtips — sleeker than bronze
  return (
    <g>
      {/* Main shield */}
      <path
        d="M20 3 L35 10 L35 25 Q35 35 20 39 Q5 35 5 25 L5 10 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner highlight lines */}
      <path
        d="M20 3 L35 10 L35 25 Q35 35 20 39 Q5 35 5 25 L5 10 Z"
        fill={color}
        opacity="0.12"
      />
      {/* Wing-like side cuts */}
      <path
        d="M5 14 L1 18 L5 22"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M35 14 L39 18 L35 22"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center diamond pip */}
      <path
        d="M20 14 L25 20 L20 26 L15 20 Z"
        fill={color}
        opacity="0.7"
      />
    </g>
  )
}

function GoldIcon({ color }) {
  // Crowned shield — regal look
  return (
    <g>
      {/* Crown points */}
      <path
        d="M8 11 L12 5 L20 10 L28 5 L32 11"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Shield body */}
      <path
        d="M8 11 L32 11 L32 26 Q32 36 20 40 Q8 36 8 26 Z"
        fill={color}
        opacity="0.15"
        strokeLinejoin="round"
      />
      <path
        d="M8 11 L32 11 L32 26 Q32 36 20 40 Q8 36 8 26 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner star */}
      <path
        d="M20 16 L21.8 21.5 L27.5 21.5 L22.9 24.8 L24.7 30.3 L20 27 L15.3 30.3 L17.1 24.8 L12.5 21.5 L18.2 21.5 Z"
        fill={color}
        opacity="0.75"
      />
    </g>
  )
}

function PlatinumIcon({ color }) {
  // Hexagonal shape with crosshatch — technical, futuristic
  return (
    <g>
      {/* Outer hex */}
      <path
        d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner hex fill */}
      <path
        d="M20 6 L33 13 L33 27 L20 34 L7 27 L7 13 Z"
        fill={color}
        opacity="0.12"
      />
      {/* Diagonal cross lines */}
      <line x1="10" y1="15" x2="30" y2="25" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <line x1="30" y1="15" x2="10" y2="25" stroke={color} strokeWidth="1.2" opacity="0.4" />
      {/* Center circle */}
      <circle cx="20" cy="20" r="5" fill={color} opacity="0.65" />
      <circle cx="20" cy="20" r="3" fill="none" stroke={color} strokeWidth="1.5" />
    </g>
  )
}

function DiamondIcon({ color }) {
  // Large diamond with inner facets — crystalline
  return (
    <g>
      {/* Outer diamond */}
      <path
        d="M20 2 L38 20 L20 38 L2 20 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Fill */}
      <path
        d="M20 2 L38 20 L20 38 L2 20 Z"
        fill={color}
        opacity="0.1"
      />
      {/* Facet lines from top */}
      <line x1="20" y1="2" x2="9" y2="17" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="20" y1="2" x2="31" y2="17" stroke={color} strokeWidth="1" opacity="0.4" />
      {/* Facet lines from bottom */}
      <line x1="20" y1="38" x2="9" y2="23" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="20" y1="38" x2="31" y2="23" stroke={color} strokeWidth="1" opacity="0.4" />
      {/* Middle horizon */}
      <line x1="2" y1="20" x2="38" y2="20" stroke={color} strokeWidth="1" opacity="0.35" />
      {/* Inner core diamond */}
      <path
        d="M20 12 L28 20 L20 28 L12 20 Z"
        fill={color}
        opacity="0.6"
      />
    </g>
  )
}

function MasterIcon({ color }) {
  // Ornate tri-wing insignia — elite feel
  return (
    <g>
      {/* Left wing */}
      <path
        d="M20 20 L4 12 L2 20 L4 28 Z"
        fill={color}
        opacity="0.5"
        strokeLinejoin="round"
      />
      {/* Right wing */}
      <path
        d="M20 20 L36 12 L38 20 L36 28 Z"
        fill={color}
        opacity="0.5"
        strokeLinejoin="round"
      />
      {/* Top spike */}
      <path
        d="M20 20 L14 4 L20 8 L26 4 Z"
        fill={color}
        opacity="0.5"
        strokeLinejoin="round"
      />
      {/* Central orb */}
      <circle cx="20" cy="20" r="8" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="20" cy="20" r="5" fill={color} opacity="0.7" />
      {/* Wing outlines */}
      <path
        d="M20 20 L4 12 L2 20 L4 28 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M20 20 L36 12 L38 20 L36 28 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M20 20 L14 4 L20 8 L26 4 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </g>
  )
}

function PredatorIcon({ color }) {
  // Skull-like triple-point crown — apex predator
  return (
    <g>
      {/* Outer glow ring */}
      <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
      {/* Three spike crown */}
      <path
        d="M20 4 L23 13 L29 6 L26 16 L36 13 L28 20 L36 27 L26 24 L29 34 L20 28 L11 34 L14 24 L4 27 L12 20 L4 13 L14 16 L11 6 L17 13 Z"
        fill={color}
        opacity="0.5"
        strokeLinejoin="round"
      />
      <path
        d="M20 4 L23 13 L29 6 L26 16 L36 13 L28 20 L36 27 L26 24 L29 34 L20 28 L11 34 L14 24 L4 27 L12 20 L4 13 L14 16 L11 6 L17 13 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner skull-eye dots */}
      <circle cx="16" cy="18" r="2.5" fill={color} />
      <circle cx="24" cy="18" r="2.5" fill={color} />
      {/* Fang mark */}
      <path
        d="M17 24 L20 28 L23 24"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function RankIcon({ tier, color, size = 40 }) {
  const Icon = TIER_ICONS[tier] || BronzeIcon
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ display: 'block', filter: `drop-shadow(0 0 4px ${color}88)` }}
    >
      <Icon color={color} />
    </svg>
  )
}

// Division pips: division 4 = lowest (1 pip filled), division 1 = highest (4 pips filled)
// Pips fill left-to-right as you progress through divisions within a tier.
function DivisionPips({ division, color }) {
  if (!division || division === 0) return null // Master/Predator have no division pips
  const totalPips = 4
  // Division 4 → 1 pip filled, Division 3 → 2 filled, ..., Division 1 → 4 filled
  const filledCount = 5 - division
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: totalPips }, (_, i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: i < filledCount ? color : 'transparent',
            border: `1.5px solid ${color}`,
            opacity: i < filledCount ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  )
}

function LockIcon({ color }) {
  return (
    <svg
      width="10"
      height="12"
      viewBox="0 0 10 12"
      fill="none"
      style={{ position: 'absolute', bottom: 4, right: 4 }}
    >
      <rect x="1" y="5" width="8" height="7" rx="1.5"
        stroke={color} strokeWidth="1.5" />
      <path d="M3 5V3.5a2 2 0 014 0V5"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── XP Delta face ──────────────────────────────────────────────────────────
// Shown in place of the rank badge during the XP flash.
// Positive delta → green-tinted tier color. Negative (bleed) → red-tinted.
function XPDeltaFace({ xpDelta, color }) {
  const isNegative = xpDelta < 0
  const isZero = xpDelta === 0
  const display = isNegative ? `${xpDelta} XP` : `+${xpDelta} XP`

  // Gains → tier color, losses → red, zero → muted
  const accent = isNegative ? '#ff5555' : isZero ? `${color}88` : color

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      {/* Arrow indicator — hidden when zero */}
      {!isZero && (
        <div style={{ fontSize: 10, lineHeight: 1, color: accent, opacity: 0.8 }}>
          {isNegative ? '▼' : '▲'}
        </div>
      )}
      {/* XP number */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '-0.5px',
          lineHeight: 1,
          color: accent,
          filter: `drop-shadow(0 0 6px ${accent}88)`,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {display}
      </div>
      {/* "today" label */}
      <div
        style={{
          fontSize: 8,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: accent,
          opacity: 0.55,
          lineHeight: 1,
        }}
      >
        today
      </div>
    </div>
  )
}

// ── Timings ────────────────────────────────────────────────────────────────
const BADGE_HOLD_MS = 6400   // how long the rank badge shows
const XP_HOLD_MS    = 4400   // how long the XP delta shows
const TRANSITION_MS = 500    // fade-out duration before swap
const CYCLE_MS      = BADGE_HOLD_MS + XP_HOLD_MS

// CSS keyframes injected once
const FLIP_STYLE = `
  @keyframes rankShrinkOut {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.55); }
  }
  @keyframes rankGrowIn {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.13); }
    80%  { transform: scale(0.94); }
    90%  { transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes rankFadeOut {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.75); }
  }
`
if (typeof document !== 'undefined' && !document.getElementById('rank-flip-style')) {
  const s = document.createElement('style')
  s.id = 'rank-flip-style'
  s.textContent = FLIP_STYLE
  document.head.appendChild(s)
}

export default function RankDisplay() {
  const progression = useTaskStore(s => s.progression)
  const tasks       = useTaskStore(s => s.tasks)
  const settings    = useTaskStore(s => s.settings)
  const soundEnabled = settings.soundEnabled
  const isDark = settings.theme === 'dark'

  const rank     = getRankById(progression.currentRankId)
  const nextRank = getNextRank(progression.currentRankId)
  const progress = getXPProgress(progression.currentXP, progression.currentRankId)
  const tierColor  = RANK_COLORS[rank.tier]?.primary || '#888'
  const trackColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  const offset = CIRCUMFERENCE - (progress.percentage / 100) * CIRCUMFERENCE

  const showCapLock = progression.bleedCapHitToday && !progression.boardClearedToday
  const lockColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)'

  // ── Daily XP delta ────────────────────────────────────────────────────────
  // Sum completion XP + creation XP for all tasks touched since today's reset.
  const dailyXPEarned = (() => {
    const resetHour = settings.dailyResetHourUTC ?? 10
    const resetBoundary = getResetTimestamp(resetHour)
    // Completion XP: done tasks completed today
    const completionXP = tasks
      .filter(t => t.status === 'done' && t.completedAt && t.completedAt > resetBoundary)
      .reduce((sum, t) => sum + (t.final_xp_awarded || 0), 0)
    // Creation XP: all tasks created today (any status)
    const creationXP = tasks
      .filter(t => t.createdAt && t.createdAt > resetBoundary)
      .reduce((sum, t) => sum + (t.creation_xp_awarded || 0), 0)
    return completionXP + creationXP
  })()

  // Net delta also accounts for bleed lost today
  const bleedLost  = progression.dailyBleedTotal || 0
  const xpDelta = dailyXPEarned - bleedLost

  // ── Flash toggle ──────────────────────────────────────────────────────────
  // phase: 'badge-show' | 'badge-out' | 'xp-in' | 'xp-show' | 'xp-out' | 'badge-in'
  const [phase, setPhase] = useState('badge-show')
  const timerRef = useRef(null)

  useEffect(() => {
    function schedule(nextPhase, delayMs) {
      timerRef.current = setTimeout(() => runPhase(nextPhase), delayMs)
    }

    function runPhase(p) {
      setPhase(p)
      switch (p) {
        case 'badge-show': schedule('badge-out',  BADGE_HOLD_MS); break
        case 'badge-out':  schedule('xp-in',      TRANSITION_MS); break
        case 'xp-in':      schedule('xp-show',    TRANSITION_MS + 150); break
        case 'xp-show':    schedule('xp-out',     XP_HOLD_MS);   break
        case 'xp-out':     schedule('badge-in',   TRANSITION_MS); break
        case 'badge-in':   schedule('badge-show', TRANSITION_MS + 150); break
      }
    }

    runPhase('badge-show')
    return () => clearTimeout(timerRef.current)
  }, [])

  // ── Rank Proximity Glow ─────────────────────────────────────────────────────
  const proximityPct = nextRank && rank.xpToNext > 0
    ? (progression.currentXP - rank.xpRequired) / rank.xpToNext * 100
    : 100
  const glowActive = !!nextRank && proximityPct >= 95 && !progression.bleedCapHitToday
  const nextTierColor = nextRank ? (RANK_COLORS[nextRank.tier]?.primary || tierColor) : tierColor

  const glowIntensity = glowActive
    ? proximityPct >= 99 ? 1.0 : proximityPct >= 98 ? 0.7 : 0.4
    : 0

  const prevGlowRef = useRef(false)
  useEffect(() => {
    if (glowActive && !prevGlowRef.current && soundEnabled) {
      playRankProximityTone()
    }
    prevGlowRef.current = glowActive
  }, [glowActive, soundEnabled])

  const maxGlowOpacity  = glowActive ? 0.3 + glowIntensity * 0.55 : 0
  const maxStrokeExtra  = glowActive ? glowIntensity * 2.5 : 0
  const arcColor        = glowActive ? nextTierColor : tierColor
  const pulseAnimName   = `rankGlow_${nextTierColor.replace('#', '')}`

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      {glowActive && (
        <style>{`
          @keyframes ${pulseAnimName} {
            0%, 100% { opacity: 0.15; stroke-width: ${STROKE}px; }
            50%       { opacity: ${maxGlowOpacity}; stroke-width: ${STROKE + maxStrokeExtra}px; }
          }
        `}</style>
      )}

      {/* Circular XP progress ring */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={trackColor}
          strokeWidth={STROKE}
        />

        {/* Glow pulse overlay */}
        {glowActive && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={nextTierColor}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              animation: `${pulseAnimName} 2.5s ease-in-out infinite`,
              filter: `drop-shadow(0 0 6px ${nextTierColor})`,
              transition: 'stroke-dashoffset 0.5s ease',
            }}
          />
        )}

        {/* Progress arc */}
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={arcColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            filter: `drop-shadow(0 0 3px ${arcColor}88)`,
          }}
        />
      </svg>

      {/* Liquid-glass disc behind the center content — tinted with rank color */}
      <div
        style={{
          position: 'absolute',
          inset: STROKE + 2,
          borderRadius: '50%',
          // Specular highlight at top-left stays white for glass feel;
          // mid and edge are tinted with tierColor at low opacity.
          background: isDark
            ? `radial-gradient(circle at 38% 32%, rgba(255,255,255,0.10) 0%, ${tierColor}22 45%, ${tierColor}18 100%)`
            : `radial-gradient(circle at 38% 32%, rgba(255,255,255,0.82) 0%, ${tierColor}28 55%, ${tierColor}20 100%)`,
          backdropFilter: 'blur(12px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.5)',
          boxShadow: isDark
            ? `inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.22), inset 0 0 12px ${tierColor}18`
            : `inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -1px 0 rgba(0,0,0,0.06), inset 0 0 10px ${tierColor}14`,
        }}
      />

      {/* Center: rank badge ↔ XP delta */}
      {/* Badge — visible during badge-show / badge-out / badge-in */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 4,
          animation:
            phase === 'badge-out' ? `rankShrinkOut ${TRANSITION_MS}ms ease-in forwards` :
            phase === 'badge-in'  ? `rankGrowIn ${TRANSITION_MS + 150}ms cubic-bezier(0.22,1,0.36,1) forwards` :
            'none',
          opacity: (phase === 'xp-in' || phase === 'xp-show' || phase === 'xp-out') ? 0 : 1,
        }}
      >
        <RankIcon tier={rank.tier} color={tierColor} size={42} />
        <DivisionPips division={rank.division} color={tierColor} />
      </div>

      {/* XP delta — visible during xp-in / xp-show / xp-out */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation:
            phase === 'xp-in'  ? `rankGrowIn ${TRANSITION_MS + 150}ms cubic-bezier(0.22,1,0.36,1) forwards` :
            phase === 'xp-out' ? `rankFadeOut ${TRANSITION_MS}ms ease-in forwards` :
            'none',
          opacity: (phase === 'badge-show' || phase === 'badge-out' || phase === 'badge-in') ? 0 : 1,
        }}
      >
        <XPDeltaFace xpDelta={xpDelta} color={tierColor} />
      </div>

      {showCapLock && <LockIcon color={lockColor} />}
    </div>
  )
}
