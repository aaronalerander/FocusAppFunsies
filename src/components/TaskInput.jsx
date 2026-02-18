import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'

const GOLD = '#FFD700'

export default function TaskInput() {
  const [value, setValue] = useState('')
  const addTask = useTaskStore(s => s.addTask)
  const theme = useTaskStore(s => s.settings.theme)
  const activeTab = useTaskStore(s => s.ui.activeTab)
  const tasks = useTaskStore(s => s.tasks)
  const taskSlots = useTaskStore(s => s.taskSlots())
  const boardClearedToday = useTaskStore(s => s.progression.boardClearedToday)
  const inputRef = useRef(null)

  const isDark = theme === 'dark'
  const useGold = boardClearedToday
  const isToday = activeTab !== 'later' && activeTab !== 'done'
  const todayCount = isToday ? tasks.filter(t => t.status === 'today').length : 0
  const isFull = isToday && todayCount >= taskSlots
  const placeholder = activeTab === 'later' ? 'Park this for later...' : 'What needs to happen today?'

  // Auto-focus input when user starts typing anywhere in the app
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Skip if already focused on an input/textarea
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return

      // Skip modifier keys (except shift for capitals), nav keys, function keys, etc.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.length !== 1) return // Only printable characters (length === 1)

      // Focus the input and let the character through
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        addTask(value)
        setValue('')
      }
    }
    if (e.key === 'Escape') {
      setValue('')
      inputRef.current?.blur()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 28 }}
      className={`mx-6 mt-2 mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        isDark
          ? `bg-surface-dark border-border-dark ${useGold ? 'focus-within:border-[#FFD700]/40' : 'focus-within:border-accent/40'}`
          : `bg-surface-light border-border-light ${useGold ? 'focus-within:border-[#FFD700]/60' : 'focus-within:border-accent/60'}`
      }`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        className={`flex-shrink-0 ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}
      >
        <path
          d="M7 1v12M1 7h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`flex-1 bg-transparent text-sm font-sans outline-none placeholder:opacity-40 no-drag ${
          isDark
            ? 'text-text-dark placeholder:text-muted-dark'
            : 'text-text-light placeholder:text-muted-light'
        }`}
      />
      {isToday && (
        <span className={`text-[10px] font-sans tabular-nums flex-shrink-0 ${
          isFull ? 'text-amber-500' : isDark ? 'text-muted-dark opacity-50' : 'text-muted-light opacity-50'
        }`}>
          {todayCount}/{taskSlots}
        </span>
      )}
      {value && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}
        >
          ↵
        </motion.span>
      )}
    </motion.div>
  )
}
