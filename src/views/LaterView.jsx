import { AnimatePresence, motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import TaskInput from '@/components/TaskInput'
import TaskItem from '@/components/TaskItem'
import { taskItemVariants } from '@/hooks/useAnimations'

function EmptyState({ isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <p className={`text-sm font-sans text-center ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-50`}>
        The holding pen is empty.
        <br />
        Park tasks here for later.
      </p>
    </motion.div>
  )
}

export default function LaterView() {
  const laterTasks = useTaskStore(s => s.laterTasks())
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  return (
    <div className="h-full flex flex-col pt-4">
      <TaskInput />

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {laterTasks.map(task => (
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

        {laterTasks.length === 0 && <EmptyState isDark={isDark} />}
      </div>
    </div>
  )
}
