import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import TaskItem from '@/components/TaskItem'
import { getLogicalToday, getLogicalDay } from '@/utils/dateUtils'

function XPBadge({ xp, isDark }) {
  const isNeg = xp < 0
  const label = isNeg ? `${xp} XP` : `+${xp} XP`
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.3px',
        color: isNeg ? '#f87171' : isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.32)',
      }}
    >
      {label}
    </span>
  )
}

function DeleteButton({ onClick, isDark }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
        isDark
          ? 'text-muted-dark hover:text-red-400 hover:bg-red-400/10'
          : 'text-muted-light hover:text-red-500 hover:bg-red-500/10'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 3.5h10M5.5 3.5V2.5h3V3.5M5 6v4.5M9 6v4.5M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

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

function formatDayHeader(dateStr, resetHourUTC) {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const logicalToday = getLogicalToday(resetHourUTC)
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

function DaySection({ dateStr, tasks, isDark, resetHourUTC, developerMode, onDelete, todayBleed, logicalToday }) {
  const [isOpen, setIsOpen] = useState(false)

  const earnedXP = tasks.reduce((sum, t) => sum + (t.final_xp_awarded || 0), 0)
  // Bleed is only tracked for the current logical day
  const bleed = dateStr === logicalToday ? (todayBleed || 0) : 0
  const xpDelta = earnedXP - bleed

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
            {formatDayHeader(dateStr, resetHourUTC)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <XPBadge xp={xpDelta} isDark={isDark} />
          <span className={`text-xs font-sans tabular-nums ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-60`}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
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
              <div key={task.id} className="relative flex items-center group">
                <div className="flex-1 min-w-0">
                  <TaskItem task={task} />
                </div>
                {developerMode && (
                  <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteButton onClick={() => onDelete(task.id)} isDark={isDark} />
                  </div>
                )}
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
  const dailyResetHourUTC = useTaskStore(s => s.settings.dailyResetHourUTC) ?? 10
  const developerMode = useTaskStore(s => s.settings.developerMode ?? false)
  const dailyBleedTotal = useTaskStore(s => s.progression.dailyBleedTotal || 0)
  const deleteTask = useTaskStore(s => s.deleteTask)
  const isDark = theme === 'dark'
  const logicalToday = getLogicalToday(dailyResetHourUTC)
  const [page, setPage] = useState(1)

  // Group tasks by completion date (using logical day boundary)
  const groupedByDay = useMemo(() => {
    const groups = []
    const map = new Map()

    for (const task of doneTasks) {
      const day = task.completedAt ? getLogicalDay(task.completedAt, dailyResetHourUTC) : 'unknown'
      if (!map.has(day)) {
        const entry = { date: day, tasks: [] }
        map.set(day, entry)
        groups.push(entry)
      }
      map.get(day).tasks.push(task)
    }

    return groups
  }, [doneTasks, dailyResetHourUTC])

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
            resetHourUTC={dailyResetHourUTC}
            developerMode={developerMode}
            onDelete={deleteTask}
            todayBleed={dailyBleedTotal}
            logicalToday={logicalToday}
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
