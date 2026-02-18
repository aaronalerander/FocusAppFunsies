import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { getRankById, RANK_COLORS } from '@/utils/progression'

function RankShield({ tier, size = 64 }) {
  const color = RANK_COLORS[tier]?.primary || '#888'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M32 4L42 22L60 26L46 40L50 60L32 50L14 60L18 40L4 26L22 22L32 4Z"
        fill={color}
        stroke={color}
        strokeWidth="1"
        opacity="0.95"
      />
      <path
        d="M32 12L39 25L52 28L42 38L45 52L32 45L19 52L22 38L12 28L25 25L32 12Z"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.5"
      />
    </svg>
  )
}

export default function RankUpAnimation() {
  const rankUpAnimation = useTaskStore(s => s.ui.rankUpAnimation)
  const dismissRankUpAnimation = useTaskStore(s => s.dismissRankUpAnimation)
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  // Fire confetti on mount
  const confettiState = useTaskStore(s => s.ui.confetti)

  useEffect(() => {
    if (!rankUpAnimation) return
    // Trigger a jackpot-style confetti for rank-up
    useTaskStore.setState(state => ({
      ui: { ...state.ui, confetti: { mode: 'jackpot', id: Date.now() } }
    }))
  }, [rankUpAnimation])

  if (!rankUpAnimation) return null

  const fromRank = getRankById(rankUpAnimation.fromRankId)
  const toRank = getRankById(rankUpAnimation.toRankId)
  const tierColor = RANK_COLORS[toRank.tier]?.primary || '#888'

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={dismissRankUpAnimation}
      >
        {/* Backdrop with color tint */}
        <div className={`absolute inset-0 ${isDark ? 'bg-black/80' : 'bg-black/60'} backdrop-blur-md`} />

        {/* Glow ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 200, height: 200,
            background: `radial-gradient(circle, ${tierColor}33 0%, transparent 70%)`
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 2.5, 2], opacity: [0, 0.8, 0.4] }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        {/* Content */}
        <motion.div
          className="relative z-10 flex flex-col items-center"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          {/* Flash */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: tierColor }}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: [0, 3, 0], opacity: [0.8, 0.4, 0] }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {/* Shield */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
          >
            <RankShield tier={toRank.tier} size={80} />
          </motion.div>

          {/* Rank transition text */}
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <p className={`text-xs font-sans mb-1 ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
              {fromRank.name}
            </p>
            <div className={`text-xs mb-2 ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" className="inline" fill="none">
                <path d="M6 2v8M3 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2
              className="text-2xl font-display font-bold tracking-wide"
              style={{ color: tierColor }}
            >
              {toRank.name}
            </h2>
          </motion.div>

          {/* New slot message */}
          {rankUpAnimation.newSlots && (
            <motion.p
              className="mt-3 text-xs font-sans font-medium text-accent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              New slot unlocked — Today now holds {rankUpAnimation.newSlots} tasks
            </motion.p>
          )}

          {/* Dismiss hint */}
          <motion.p
            className={`mt-6 text-[10px] font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-50`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1.2 }}
          >
            tap to continue
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
