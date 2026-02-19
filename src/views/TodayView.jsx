import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import Counter from '@/components/Counter'
import RankDisplay from '@/components/RankDisplay'
import TaskInput from '@/components/TaskInput'
import SortableTaskList from '@/components/SortableTaskList'

function StreakMessage() {
  const streakMessage = useTaskStore(s => s.ui.streakMessage)
  const boardClearedToday = useTaskStore(s => s.progression.boardClearedToday)

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
          <span
            className={`text-sm font-sans font-medium ${boardClearedToday ? '' : 'text-accent'}`}
            style={boardClearedToday ? { color: '#FFD700' } : undefined}
          >
            {messages[streakMessage]}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-12 h-12 rounded-full border-2 mb-4 border-border-dark" />
      <p className="text-sm font-sans text-center text-muted-dark opacity-50">
        Nothing for today yet.
        <br />
        Add a task below.
      </p>
    </motion.div>
  )
}

export default function TodayView() {
  const todayTasks = useTaskStore(s => s.todayTasks())
  const boardClearedToday = useTaskStore(s => s.progression.boardClearedToday)
  const setLastTaskMoment = useTaskStore(s => s.setLastTaskMoment)

  const activeTodayCount = todayTasks.filter(t => t.status === 'today').length
  useEffect(() => {
    const isLastTask = !boardClearedToday && activeTodayCount === 1
    setLastTaskMoment(isLastTask)
  }, [activeTodayCount, boardClearedToday])

  return (
    <div className="h-full flex flex-col">
      <div>
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <Counter />
          <RankDisplay />
        </div>
        <StreakMessage />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <SortableTaskList tasks={todayTasks} />
        {todayTasks.length === 0 && <EmptyState />}
      </div>

      <TaskInput />
    </div>
  )
}
