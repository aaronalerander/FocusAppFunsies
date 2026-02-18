import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { getBurstParticleProps } from '@/hooks/useAnimations'

function CheckboxButton({ taskId, done, onComplete }) {
  const [isBursting, setIsBursting] = useState(false)
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  const handleClick = () => {
    if (done) return
    setIsBursting(true)
    onComplete()
    setTimeout(() => setIsBursting(false), 600)
  }

  return (
    <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
      {/* Burst particles */}
      <AnimatePresence>
        {isBursting && Array.from({ length: 8 }, (_, i) => {
          const props = getBurstParticleProps(i, 8)
          return (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-accent pointer-events-none"
              initial={props.initial}
              animate={props.animate}
              exit={{ opacity: 0 }}
              transition={props.transition}
              style={{ zIndex: 10 }}
            />
          )
        })}
      </AnimatePresence>

      {/* Checkbox circle */}
      <motion.div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
          done
            ? 'border-accent bg-accent/20'
            : isDark
              ? 'border-muted-dark hover:border-accent'
              : 'border-muted-light hover:border-accent'
        }`}
        animate={isBursting ? { scale: [1, 1.4, 1] } : { scale: 1 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        onClick={handleClick}
        whileHover={{ scale: done ? 1 : 1.1 }}
      >
        {done && (
          <motion.div
            className="w-2.5 h-2.5 rounded-full bg-accent"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          />
        )}
      </motion.div>
    </div>
  )
}

function StrikethroughLine({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute top-1/2 left-0 h-px bg-current opacity-40 pointer-events-none"
          style={{ transform: 'translateY(-50%)' }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, delay: 0.12, ease: 'easeOut' }}
        />
      )}
    </AnimatePresence>
  )
}

export default function TaskItem({ task }) {
  const [isHovered, setIsHovered] = useState(false)
  const completingTaskId = useTaskStore(s => s.ui.completingTaskId)
  const completeTask = useTaskStore(s => s.completeTask)
  const moveTask = useTaskStore(s => s.moveTask)
  const confirmDelete = useTaskStore(s => s.confirmDelete)
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  const isCompleting = completingTaskId === task.id
  const isDone = task.status === 'done'

  const formatDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const today = new Date()
    const isToday = d.toDateString() === today.toDateString()
    if (isToday) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div
      className={`group flex items-center gap-3 px-6 py-3 rounded-xl mx-3 mb-1 transition-colors ${
        isHovered && !isDone
          ? isDark ? 'bg-surface-dark' : 'bg-surface-light'
          : 'bg-transparent'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault()
        confirmDelete(task.id)
      }}
    >
      {/* Checkbox (only for today tasks) */}
      {task.status === 'today' && (
        <CheckboxButton
          taskId={task.id}
          done={isDone}
          onComplete={() => completeTask(task.id)}
        />
      )}

      {/* Done task circle indicator */}
      {isDone && (
        <div className="w-5 h-5 rounded-full border-2 border-accent bg-accent/20 flex items-center justify-center flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-accent" />
        </div>
      )}

      {/* Later task dot */}
      {task.status === 'later' && (
        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
          isDark ? 'border-muted-dark' : 'border-muted-light'
        }`} />
      )}

      {/* Task text */}
      <div className="flex-1 min-w-0">
        <div className="relative">
          <span
            className={`text-sm font-sans leading-snug block truncate transition-colors duration-200 ${
              isDone || isCompleting
                ? isDark ? 'text-muted-dark' : 'text-muted-light'
                : isDark ? 'text-text-dark' : 'text-text-light'
            }`}
          >
            {task.text}
          </span>
          <StrikethroughLine active={isCompleting} />
        </div>

        {/* Meta text */}
        {task.status === 'later' && task.createdAt && (
          <div className={`text-xs font-sans mt-0.5 ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-60`}>
            added {formatDate(task.createdAt)}
          </div>
        )}
        {isDone && task.completedAt && (
          <div className={`text-xs font-sans mt-0.5 ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-60`}>
            {formatDate(task.completedAt)}
          </div>
        )}
      </div>

      {/* Action buttons (hover only, not for done tasks) */}
      {!isDone && (
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 flex-shrink-0"
            >
              {/* Move button */}
              <button
                onClick={() => moveTask(task.id, task.status === 'today' ? 'later' : 'today')}
                title={task.status === 'today' ? 'Move to Later' : 'Move to Today'}
                className={`p-1.5 rounded-lg text-xs font-sans transition-colors ${
                  isDark
                    ? 'text-muted-dark hover:text-text-dark hover:bg-border-dark'
                    : 'text-muted-light hover:text-text-light hover:bg-border-light'
                }`}
              >
                {task.status === 'today' ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* Delete button */}
              <button
                onClick={() => confirmDelete(task.id)}
                title="Delete"
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark
                    ? 'text-muted-dark hover:text-red-400 hover:bg-border-dark'
                    : 'text-muted-light hover:text-red-500 hover:bg-border-light'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 3.5h10M5.5 3.5V2.5h3V3.5M5 6v4.5M9 6v4.5M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
