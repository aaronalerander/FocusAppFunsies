import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useTaskStore from '@/store/tasks'

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.15 } }
}

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
  exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.15 } }
}

export default function BonusRoundModal() {
  const bonusRoundActive = useTaskStore(s => s.ui.bonusRoundActive)
  const laterTasks = useTaskStore(s => s.laterTasks())
  const taskSlots = useTaskStore(s => s.taskSlots())
  const todayTasks = useTaskStore(s => s.todayTasks())
  const pullFreeXPTasks = useTaskStore(s => s.pullFreeXPTasks)
  const endBonusRound = useTaskStore(s => s.endBonusRound)
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  const [selected, setSelected] = useState(new Set())
  const availableSlots = taskSlots - todayTasks.length

  if (!bonusRoundActive || laterTasks.length === 0) return null

  const toggleTask = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < availableSlots) {
        next.add(id)
      }
      return next
    })
  }

  const handlePull = () => {
    pullFreeXPTasks([...selected])
    setSelected(new Set())
  }

  const handleSkip = () => {
    endBonusRound()
    setSelected(new Set())
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-center justify-center"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Backdrop */}
        <motion.div
          className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-black/50'} backdrop-blur-sm`}
          onClick={handleSkip}
        />

        {/* Card */}
        <motion.div
          className={`relative z-10 w-[320px] max-h-[70vh] rounded-2xl shadow-2xl border flex flex-col ${
            isDark
              ? 'bg-bg-dark border-border-dark'
              : 'bg-bg-light border-border-light'
          }`}
          variants={cardVariants}
        >
          {/* Header */}
          <div className="p-5 pb-3">
            <h2 className={`text-sm font-sans font-bold mb-1 ${isDark ? 'text-text-dark' : 'text-text-light'}`}>
              Board cleared. Pull in more from Later?
            </h2>
            <p className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
              These become free XP — no penalty if unfinished.
              <br />
              {selected.size} / {availableSlots} slots selected
            </p>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto px-3 pb-2">
            {laterTasks.map(task => {
              const isSelected = selected.has(task.id)
              const isDisabled = !isSelected && selected.size >= availableSlots
              return (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-left transition-colors ${
                    isSelected
                      ? isDark ? 'bg-accent/10 border border-accent/30' : 'bg-accent/10 border border-accent/30'
                      : isDisabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isDark
                          ? 'hover:bg-surface-dark border border-transparent'
                          : 'hover:bg-surface-light border border-transparent'
                  }`}
                >
                  {/* Selection indicator */}
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'border-accent bg-accent/20'
                      : isDark ? 'border-muted-dark' : 'border-muted-light'
                  }`}>
                    {isSelected && (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-accent"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      />
                    )}
                  </div>

                  {/* Task text */}
                  <span className={`text-sm font-sans truncate ${
                    isDark ? 'text-text-dark' : 'text-text-light'
                  }`}>
                    {task.text}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="p-4 pt-2 flex gap-2">
            <button
              onClick={handleSkip}
              className={`flex-1 py-2.5 rounded-xl text-sm font-sans font-medium transition-colors ${
                isDark
                  ? 'bg-surface-dark text-text-dark hover:bg-border-dark'
                  : 'bg-surface-light text-text-light hover:bg-border-light'
              }`}
            >
              Skip
            </button>
            <button
              onClick={handlePull}
              disabled={selected.size === 0}
              className={`flex-1 py-2.5 rounded-xl text-sm font-sans font-semibold transition-colors ${
                selected.size > 0
                  ? 'bg-accent text-black hover:bg-accent/90'
                  : isDark
                    ? 'bg-surface-dark text-muted-dark cursor-not-allowed'
                    : 'bg-surface-light text-muted-light cursor-not-allowed'
              }`}
            >
              Pull In ({selected.size})
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
