import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import TaskItem from '@/components/TaskItem'

function EmptyState({ isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <p className={`text-sm font-sans text-center ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-50`}>
        Your trophy room is empty.
        <br />
        Complete a task to see it here.
      </p>
    </motion.div>
  )
}

export default function DoneView() {
  const doneTasks = useTaskStore(s => s.doneTasks())
  const lifetimeCompleted = useTaskStore(s => s.settings.lifetimeCompleted)
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  return (
    <div className="h-full flex flex-col pt-4">
      {/* Lifetime counter */}
      {lifetimeCompleted > 0 && (
        <div className="px-6 pb-4">
          <p className={`text-xs font-sans tracking-widest uppercase ${
            isDark ? 'text-muted-dark' : 'text-muted-light'
          } opacity-50`}>
            {lifetimeCompleted} task{lifetimeCompleted !== 1 ? 's' : ''} completed all-time
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {doneTasks.map(task => (
          <div key={task.id}>
            <TaskItem task={task} />
          </div>
        ))}

        {doneTasks.length === 0 && <EmptyState isDark={isDark} />}
      </div>
    </div>
  )
}
