import { AnimatePresence, motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import Counter from '@/components/Counter'
import ProgressBar from '@/components/ProgressBar'
import TaskInput from '@/components/TaskInput'
import TaskItem from '@/components/TaskItem'
import { taskItemVariants } from '@/hooks/useAnimations'

function StreakMessage() {
  const streakMessage = useTaskStore(s => s.ui.streakMessage)
  const theme = useTaskStore(s => s.settings.theme)

  const messages = {
    '5tasks': "On a roll.",
    '10tasks': "Unstoppable."
  }

  return (
    <AnimatePresence>
      {streakMessage && (
        <motion.div
          key={streakMessage}
          initial={{ opacity: 0, scale: 0.85, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="px-6 pb-2"
        >
          <span className="text-sm font-sans font-medium text-accent">
            {messages[streakMessage]}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EmptyState({ isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className={`w-12 h-12 rounded-full border-2 mb-4 ${
        isDark ? 'border-border-dark' : 'border-border-light'
      }`} />
      <p className={`text-sm font-sans text-center ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-50`}>
        Nothing for today yet.
        <br />
        Add a task above.
      </p>
    </motion.div>
  )
}

export default function TodayView() {
  const todayTasks = useTaskStore(s => s.todayTasks())
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  return (
    <div className="h-full flex flex-col">
      <Counter />
      <ProgressBar />
      <StreakMessage />
      <TaskInput />

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {todayTasks.map(task => (
            <motion.div
              key={task.id}
              layout
              variants={taskItemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <TaskItem task={task} />
            </motion.div>
          ))}
        </AnimatePresence>

        {todayTasks.length === 0 && <EmptyState isDark={isDark} />}
      </div>
    </div>
  )
}
