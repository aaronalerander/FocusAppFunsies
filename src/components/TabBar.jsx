import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'

const GOLD = '#FFD700'

const tabs = [
  { id: 'later', label: 'up next' },
  { id: 'today', label: 'today' },
  { id: 'done', label: 'done' }
]

export default function TabBar() {
  const activeTab = useTaskStore(s => s.ui.activeTab)
  const setTab = useTaskStore(s => s.setTab)
  const openSettings = useTaskStore(s => s.openSettings)
  const theme = useTaskStore(s => s.settings.theme)
  const tasks = useTaskStore(s => s.tasks)
  const boardClearedToday = useTaskStore(s => s.progression.boardClearedToday)
  const dailyResetHourUTC = useTaskStore(s => s.settings.dailyResetHourUTC) ?? 10
  const lifetimeCompleted = useTaskStore(s => s.settings.lifetimeCompleted) ?? 0

  const isDark = theme === 'dark'
  const accentColor = boardClearedToday ? GOLD : null

  const getCounts = (tabId) => {
    if (tabId === 'today') return tasks.filter(t => t.status === 'today').length
    if (tabId === 'later') return tasks.filter(t => t.status === 'later').length
    if (tabId === 'done') {
      return lifetimeCompleted
    }
    return 0
  }

  return (
    <div
      className={`flex items-center justify-between px-6 pt-10 pb-4 drag-region ${
        isDark ? 'border-border-dark' : 'border-border-light'
      }`}
    >
      {/* App name */}
      <span
        className={`text-xs font-sans tracking-widest uppercase no-drag select-none ${
          isDark ? 'text-muted-dark opacity-50' : 'text-muted-light opacity-50'
        }`}
      >
        focus
      </span>

      {/* Tabs */}
      <div className="flex items-center gap-6 no-drag">
        {tabs.map(tab => {
          const count = getCounts(tab.id)
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`relative flex items-center gap-1.5 text-sm font-sans font-medium tracking-wide pb-1 transition-colors duration-150 no-drag ${
                isActive
                  ? isDark ? 'text-text-dark' : 'text-text-light'
                  : isDark ? 'text-muted-dark hover:text-text-dark' : 'text-muted-light hover:text-text-light'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-xs font-tabular ${
                    isActive
                      ? accentColor ? '' : 'text-accent'
                      : isDark ? 'text-muted-dark' : 'text-muted-light'
                  }`}
                  style={isActive && accentColor ? { color: accentColor } : undefined}
                >
                  {count}
                </motion.span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute bottom-0 left-0 right-0 h-px ${accentColor ? '' : 'bg-accent'}`}
                  style={accentColor ? { backgroundColor: accentColor } : undefined}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Settings gear */}
      <button
        onClick={openSettings}
        className={`no-drag p-1 rounded-md transition-colors duration-150 ${
          isDark
            ? 'text-muted-dark hover:text-text-dark'
            : 'text-muted-light hover:text-text-light'
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M8 10a2 2 0 100-4 2 2 0 000 4z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M2.929 2.929l1.06 1.06M12.01 12.01l1.06 1.06M2.929 13.07l1.06-1.06M12.01 3.99l1.06-1.06"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
