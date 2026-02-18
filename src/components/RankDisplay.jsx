import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { getRankById, getXPProgress, RANK_COLORS } from '@/utils/progression'

const SIZE = 72
const STROKE = 5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function RankDisplay() {
  const progression = useTaskStore(s => s.progression)
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  const rank = getRankById(progression.currentRankId)
  const progress = getXPProgress(progression.currentXP, progression.currentRankId)
  const tierColor = RANK_COLORS[rank.tier]?.primary || '#888'
  const trackColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  const offset = CIRCUMFERENCE - (progress.percentage / 100) * CIRCUMFERENCE

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
    </div>
  )
}
