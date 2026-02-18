import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { getRankById, getXPProgress, RANK_COLORS } from '@/utils/progression'

const SIZE = 72
const STROKE = 5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

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

export default function RankDisplay() {
  const progression = useTaskStore(s => s.progression)
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  const rank = getRankById(progression.currentRankId)
  const progress = getXPProgress(progression.currentXP, progression.currentRankId)
  const tierColor = RANK_COLORS[rank.tier]?.primary || '#888'
  const trackColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  const offset = CIRCUMFERENCE - (progress.percentage / 100) * CIRCUMFERENCE

  // Show cap-hit lock only when bleed hit the cap but board is NOT yet cleared (not free XP mode)
  const showCapLock = progression.bleedCapHitToday && !progression.boardClearedToday
  const lockColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)'

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={trackColor}
          strokeWidth={STROKE}
        />
        {/* Progress arc */}
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={tierColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[9px] font-sans font-bold tracking-wide leading-none"
          style={{ color: tierColor }}
        >
          {rank.name}
        </span>
        <span className={`text-[8px] font-sans tabular-nums leading-tight mt-0.5 ${
          isDark ? 'text-muted-dark' : 'text-muted-light'
        }`}>
          {progress.current.toLocaleString()}/{progress.needed.toLocaleString()}
        </span>
      </div>

      {/* Cap-hit lock — appears when daily bleed cap is reached (not in free XP mode) */}
      {showCapLock && <LockIcon color={lockColor} />}
    </div>
  )
}
