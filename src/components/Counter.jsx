import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'

const DIGIT_HEIGHT = 80 // px
const GOLD = '#FFD700'

function Digit({ value, color }) {
  return (
    <div
      className="overflow-hidden relative inline-block"
      style={{ height: DIGIT_HEIGHT, width: DIGIT_HEIGHT * 0.58 }}
    >
      <motion.div
        animate={{ y: -(value * DIGIT_HEIGHT) }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, mass: 0.8 }}
        style={{ position: 'absolute', top: 0 }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <div
            key={n}
            className="font-display font-tabular select-none"
            style={{
              height: DIGIT_HEIGHT,
              fontSize: DIGIT_HEIGHT,
              lineHeight: `${DIGIT_HEIGHT}px`,
              letterSpacing: '-0.02em',
              color,
            }}
          >
            {n}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

function AnimatedNumber({ value, className, style, color }) {
  const digits = String(Math.max(0, value)).split('').map(Number)
  return (
    <div className={`inline-flex items-center ${className || ''}`} style={style}>
      {digits.map((d, i) => (
        <Digit key={i} value={d} color={color} />
      ))}
    </div>
  )
}

export default function Counter() {
  const todayProgress = useTaskStore(s => s.todayProgress())
  const theme = useTaskStore(s => s.settings.theme)
  const boardClearedToday = useTaskStore(s => s.progression.boardClearedToday)
  const isDark = theme === 'dark'
  const accentColor = boardClearedToday ? GOLD : '#C8F135'

  const { completed, total } = todayProgress

  return (
    <div>
      <div className="flex items-baseline gap-2">
        {/* Main slot-machine counter */}
        <AnimatedNumber value={completed} color={accentColor} />

        {/* Separator and total */}
        <div
          className={`flex items-baseline gap-1 ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}
          style={{ fontSize: 40, lineHeight: 1, marginLeft: 4 }}
        >
          <span className="font-display" style={{ opacity: 0.5 }}>/</span>
          <motion.span
            key={total}
            className="font-display font-tabular"
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ opacity: 0.5, fontSize: 40 }}
          >
            {total}
          </motion.span>
        </div>
      </div>

      {total === 0 && (
        <p className={`text-xs font-sans mt-1 ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-60`}>
          Add a task to get started
        </p>
      )}
      {total > 0 && completed === total && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-sans mt-1"
          style={{ color: accentColor }}
        >
          All done.
        </motion.p>
      )}
      {total > 0 && completed < total && (
        <p className={`text-xs font-sans mt-1 ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-50`}>
          {total - completed} remaining
        </p>
      )}
    </div>
  )
}
