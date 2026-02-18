import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { modalVariants } from '@/hooks/useAnimations'

export default function DeleteModal() {
  const confirmDeleteId = useTaskStore(s => s.ui.confirmDeleteId)
  const tasks = useTaskStore(s => s.tasks)
  const deleteTask = useTaskStore(s => s.deleteTask)
  const cancelDelete = useTaskStore(s => s.cancelDelete)
  const theme = useTaskStore(s => s.settings.theme)
  const isDark = theme === 'dark'

  const task = tasks.find(t => t.id === confirmDeleteId)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') cancelDelete()
      if (e.key === 'Enter') deleteTask(confirmDeleteId)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [confirmDeleteId, cancelDelete, deleteTask])

  if (!task) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={cancelDelete}
      />

      {/* Modal */}
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`relative z-10 mx-6 w-full max-w-sm rounded-2xl p-6 shadow-2xl ${
          isDark ? 'bg-surface-dark border border-border-dark' : 'bg-white border border-border-light'
        }`}
      >
        <h3 className={`text-base font-sans font-semibold mb-2 ${isDark ? 'text-text-dark' : 'text-text-light'}`}>
          Gone for good?
        </h3>
        <p className={`text-sm font-sans mb-1 ${isDark ? 'text-muted-dark' : 'text-muted-light'} line-clamp-2`}>
          "{task.text}"
        </p>
        <p className={`text-xs font-sans mb-6 ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-60`}>
          This cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={cancelDelete}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-sans font-medium transition-colors ${
              isDark
                ? 'bg-border-dark text-text-dark hover:bg-muted-dark/30'
                : 'bg-border-light text-text-light hover:bg-muted-light/20'
            }`}
          >
            Keep
          </button>
          <button
            onClick={() => deleteTask(confirmDeleteId)}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-sans font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  )
}
