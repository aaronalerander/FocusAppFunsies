import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { getRankById, getXPProgress, RANK_COLORS } from '@/utils/progression'

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } }
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25, staggerChildren: 0.1, delayChildren: 0.2 }
  },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
}

function AnimatedNumber({ value, duration = 1000 }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    let start = 0
    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{displayed.toLocaleString()}</span>
}

export default function XPSummary() {
  const xpSummary = useTaskStore(s => s.ui.xpSummary)
  const dismissXPSummary = useTaskStore(s => s.dismissXPSummary)
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  if (!xpSummary) return null

  const rank = getRankById(xpSummary.currentRankId)
  const tierColor = RANK_COLORS[rank.tier]?.primary || '#888'
  const progress = getXPProgress(xpSummary.currentXP, xpSummary.currentRankId)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-center justify-center"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Backdrop */}
        <motion.div
          className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-black/50'} backdrop-blur-sm`}
          onClick={dismissXPSummary}
        />

        {/* Card */}
        <motion.div
          className={`relative z-10 w-[320px] rounded-2xl p-6 shadow-2xl border ${
            isDark
              ? 'bg-bg-dark border-border-dark'
              : 'bg-bg-light border-border-light'
          }`}
          variants={cardVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-5">
            <h2 className="text-lg font-display font-bold" style={{ color: tierColor }}>
              Board Clear!
            </h2>
          </motion.div>

          {/* Tasks completed */}
          <motion.div variants={itemVariants} className="flex justify-between items-center mb-3">
            <span className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
              Tasks completed
            </span>
            <span className={`text-sm font-sans font-semibold ${isDark ? 'text-text-dark' : 'text-text-light'}`}>
              {xpSummary.tasksCompleted}
            </span>
          </motion.div>

          {/* Base XP */}
          <motion.div variants={itemVariants} className="flex justify-between items-center mb-3">
            <span className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
              Base XP
            </span>
            <span className={`text-sm font-sans font-semibold ${isDark ? 'text-text-dark' : 'text-text-light'}`}>
              +{(xpSummary.tasksCompleted * 100).toLocaleString()}
            </span>
          </motion.div>

          {/* Ramp bonus */}
          {xpSummary.tasksCompleted > 1 && (
            <motion.div variants={itemVariants} className="flex justify-between items-center mb-3">
              <span className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
                Daily ramp bonus
              </span>
              <span className="text-sm font-sans font-semibold" style={{ color: '#FFD700' }}>
                +{(xpSummary.totalXP - (xpSummary.tasksCompleted * 100 * xpSummary.streakMultiplier)).toFixed(0)}
              </span>
            </motion.div>
          )}

          {/* Streak */}
          {xpSummary.streakDays > 1 && (
            <motion.div variants={itemVariants} className="flex justify-between items-center mb-3">
              <span className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
                {xpSummary.streakDays}-Day Streak
              </span>
              <span className="text-sm font-sans font-semibold text-amber-400">
                {xpSummary.streakMultiplier}x
              </span>
            </motion.div>
          )}

          {/* Divider */}
          <motion.div variants={itemVariants}>
            <div className={`h-px my-3 ${isDark ? 'bg-border-dark' : 'bg-border-light'}`} />
          </motion.div>

          {/* Total XP */}
          <motion.div variants={itemVariants} className="flex justify-between items-center mb-4">
            <span className={`text-sm font-sans font-bold ${isDark ? 'text-text-dark' : 'text-text-light'}`}>
              Total XP
            </span>
            <span className="text-lg font-sans font-bold" style={{ color: '#FFD700' }}>
              +<AnimatedNumber value={xpSummary.totalXP} />
            </span>
          </motion.div>

          {/* XP Progress bar */}
          <motion.div variants={itemVariants} className="mb-5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-sans font-medium" style={{ color: tierColor }}>
                {rank.name}
              </span>
              <span className={`text-[10px] font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
                {progress.current.toLocaleString()} / {progress.needed.toLocaleString()} XP
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
            }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: tierColor }}
                initial={{ width: '0%' }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ delay: 0.8, duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </div>
          </motion.div>

          {/* Action button */}
          <motion.div variants={itemVariants}>
            <button
              onClick={dismissXPSummary}
              className={`w-full py-2.5 rounded-xl text-sm font-sans font-semibold transition-colors ${
                isDark
                  ? 'bg-surface-dark text-text-dark hover:bg-border-dark'
                  : 'bg-surface-light text-text-light hover:bg-border-light'
              }`}
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
