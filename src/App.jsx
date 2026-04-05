import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import TabBar from '@/components/TabBar'
import TodayView from '@/views/TodayView'
import LaterView from '@/views/LaterView'
import DoneView from '@/views/DoneView'
import Settings from '@/components/Settings'
import DeleteModal from '@/components/DeleteModal'
import Confetti from '@/components/Confetti'
import Toast from '@/components/Toast'
import XPSummary from '@/components/XPSummary'
import RankUpAnimation from '@/components/RankUpAnimation'
import SlotMachine from '@/components/SlotMachine'
import Onboarding from '@/components/Onboarding'

const tabOrder = ['later', 'today', 'done']

export default function App() {
  const initialize = useTaskStore(s => s.initialize)
  const isLoaded = useTaskStore(s => s.ui.isLoaded)
  const activeTab = useTaskStore(s => s.ui.activeTab)
  const isSettingsOpen = useTaskStore(s => s.ui.isSettingsOpen)
  const confirmDeleteId = useTaskStore(s => s.ui.confirmDeleteId)
  const confetti = useTaskStore(s => s.ui.confetti)
  const xpSummary = useTaskStore(s => s.ui.xpSummary)
  const rankUpAnimation = useTaskStore(s => s.ui.rankUpAnimation)
  const slotMachine = useTaskStore(s => s.ui.slotMachine)
  const openSettings = useTaskStore(s => s.openSettings)
  const onboardingCompleted = useTaskStore(s => s.settings.onboardingCompleted)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    document.documentElement.style.backgroundColor = '#0F0F0F'
  }, [])

  // Keyboard shortcut for settings
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        openSettings()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openSettings])

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-dark">
        <div className="text-sm font-sans tracking-widest uppercase opacity-40 text-text-dark">
          focus
        </div>
      </div>
    )
  }

  if (!onboardingCompleted) {
    return <Onboarding />
  }

  const currentTabIndex = tabOrder.indexOf(activeTab)

  return (
    <div
      data-theme="dark"
      className="h-full flex flex-col overflow-hidden bg-bg-dark text-text-dark"
    >
      <Confetti confetti={confetti} />
      <TabBar />

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'today' && (
            <motion.div
              key="today"
              custom={1 - currentTabIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0"
            >
              <TodayView />
            </motion.div>
          )}
          {activeTab === 'later' && (
            <motion.div
              key="later"
              custom={0 - currentTabIndex}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0"
            >
              <LaterView />
            </motion.div>
          )}
          {activeTab === 'done' && (
            <motion.div
              key="done"
              custom={2 - currentTabIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0"
            >
              <DoneView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Toast />

      <AnimatePresence>
        {slotMachine && <SlotMachine key="slot-machine" />}
      </AnimatePresence>

      <AnimatePresence>
        {xpSummary && <XPSummary key="xp-summary" />}
      </AnimatePresence>

      <AnimatePresence>
        {rankUpAnimation && <RankUpAnimation key="rank-up" />}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && <Settings />}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteId && <DeleteModal />}
      </AnimatePresence>
    </div>
  )
}
