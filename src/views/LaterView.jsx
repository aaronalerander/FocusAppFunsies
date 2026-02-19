import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import TaskInput from '@/components/TaskInput'
import SortableTaskList from '@/components/SortableTaskList'

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <p className="text-sm font-sans text-center text-muted-dark opacity-50">
        Nothing up next.
        <br />
        Park tasks here to tackle later.
      </p>
    </motion.div>
  )
}

export default function LaterView() {
  const laterTasks = useTaskStore(s => s.laterTasks())

  return (
    <div className="h-full flex flex-col pt-4">
      <div className="flex-1 overflow-y-auto">
        <SortableTaskList tasks={laterTasks} />
        {laterTasks.length === 0 && <EmptyState />}
      </div>

      <TaskInput />
    </div>
  )
}
