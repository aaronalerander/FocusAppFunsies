import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'

export default function ProgressBar() {
  const todayProgress = useTaskStore(s => s.todayProgress())
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  const { percentage, total } = todayProgress

  if (total === 0) return null

  return (
    <div className="px-6 pb-4">
      <div
        className={`h-1 w-full rounded-full overflow-hidden ${
          isDark ? 'bg-border-dark' : 'bg-border-light'
        }`}
      >
        <motion.div
          className="h-full rounded-full bg-accent"
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{ minWidth: percentage > 0 ? 4 : 0 }}
        />
      </div>
    </div>
  )
}
