import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import TaskItem from '@/components/TaskItem'
import { getLogicalToday } from '@/utils/dateUtils'

const PAGE_SIZE = 20

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

function formatDayHeader(dateStr) {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const logicalToday = getLogicalToday()
  const logicalYesterday = new Date(logicalToday + 'T12:00:00')
  logicalYesterday.setDate(logicalYesterday.getDate() - 1)
  const logicalYesterdayStr = logicalYesterday.toISOString().split('T')[0]

  if (dateStr === logicalToday) return 'Today'
  if (dateStr === logicalYesterdayStr) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

function DaySection({ dateStr, tasks, isDark }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`border-b ${isDark ? 'border-border-dark' : 'border-border-light'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-6 py-3 text-left transition-colors ${
          isDark ? 'hover:bg-surface-dark' : 'hover:bg-surface-light'
        }`}
      >
        <div className="flex items-center gap-3">
          <motion.svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            className={isDark ? 'text-muted-dark' : 'text-muted-light'}
          >
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </motion.svg>
          <span className={`text-sm font-sans font-medium ${isDark ? 'text-text-dark' : 'text-text-light'}`}>
            {formatDayHeader(dateStr)}
          </span>
        </div>
        <span className={`text-xs font-sans tabular-nums ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-60`}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {tasks.map(task => (
              <div key={task.id}>
                <TaskItem task={task} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function DoneView() {
  const doneTasks = useTaskStore(s => s.doneTasks())
  const lifetimeCompleted = useTaskStore(s => s.settings.lifetimeCompleted)
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'
  const [page, setPage] = useState(1)

  // Group tasks by completion date
  const groupedByDay = useMemo(() => {
    const groups = []
    const map = new Map()

    for (const task of doneTasks) {
      const day = task.completedAt ? task.completedAt.split('T')[0] : 'unknown'
      if (!map.has(day)) {
        const entry = { date: day, tasks: [] }
        map.set(day, entry)
        groups.push(entry)
      }
      map.get(day).tasks.push(task)
    }

    return groups
  }, [doneTasks])

  // Paginate the day groups
  const visibleGroups = groupedByDay.slice(0, page * PAGE_SIZE)
  const hasMore = visibleGroups.length < groupedByDay.length

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
        {visibleGroups.map(group => (
          <DaySection
            key={group.date}
            dateStr={group.date}
            tasks={group.tasks}
            isDark={isDark}
          />
        ))}

        {hasMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => setPage(p => p + 1)}
              className={`text-xs font-sans px-4 py-2 rounded-lg transition-colors ${
                isDark
                  ? 'text-muted-dark hover:text-text-dark hover:bg-surface-dark'
                  : 'text-muted-light hover:text-text-light hover:bg-surface-light'
              }`}
            >
              Load more
            </button>
          </div>
        )}

        {doneTasks.length === 0 && <EmptyState isDark={isDark} />}
      </div>
    </div>
  )
}
