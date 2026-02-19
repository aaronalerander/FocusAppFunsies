import { AnimatePresence, motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'

const typeStyles = {
  info: 'border-border-dark',
  warning: 'border-amber-500/50',
  success: 'border-accent/50',
}

export default function Toast() {
  const toast = useTaskStore(s => s.ui.toast)

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`fixed top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg border text-xs font-sans font-medium shadow-lg backdrop-blur-sm max-w-[280px] text-center bg-surface-dark/95 text-text-dark ${typeStyles[toast.type] || typeStyles.info}`}
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
