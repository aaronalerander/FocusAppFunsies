import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { settingsVariants } from '@/hooks/useAnimations'
import { getRankById, getXPProgress, getNextRank, RANK_COLORS } from '@/utils/progression'

function Toggle({ checked, onChange, isDark }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-accent' : isDark ? 'bg-border-dark' : 'bg-border-light'
      }`}
    >
      <motion.div
        animate={{ x: checked ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute top-1 w-4 h-4 rounded-full shadow-sm ${
          checked ? 'bg-bg-dark' : isDark ? 'bg-muted-dark' : 'bg-muted-light'
        }`}
      />
    </button>
  )
}

function SettingRow({ label, description, children, isDark }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className={`text-sm font-sans font-medium ${isDark ? 'text-text-dark' : 'text-text-light'}`}>
          {label}
        </div>
        {description && (
          <div className={`text-xs font-sans mt-0.5 ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-70`}>
            {description}
          </div>
        )}
      </div>
      <div className="ml-4 flex-shrink-0">
        {children}
      </div>
    </div>
  )
}

export default function Settings() {
  const settings = useTaskStore(s => s.settings)
  const progression = useTaskStore(s => s.progression)
  const updateSettings = useTaskStore(s => s.updateSettings)
  const resetTodayProgress = useTaskStore(s => s.resetTodayProgress)
  const resetProgression = useTaskStore(s => s.resetProgression)
  const hardReset = useTaskStore(s => s.hardReset)
  const closeSettings = useTaskStore(s => s.closeSettings)
  const isDark = settings.theme === 'dark'

  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmHardReset, setConfirmHardReset] = useState(false)

  const rank = getRankById(progression.currentRankId)
  const tierColor = RANK_COLORS[rank.tier]?.primary || '#888'

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') closeSettings()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeSettings])

  const handleResetProgression = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 3000)
      return
    }
    resetProgression()
    setConfirmReset(false)
  }

  const handleHardReset = () => {
    if (!confirmHardReset) {
      setConfirmHardReset(true)
      setTimeout(() => setConfirmHardReset(false), 3000)
      return
    }
    hardReset()
    setConfirmHardReset(false)
  }

  return (
    <div className="absolute inset-0 z-40">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={closeSettings}
      />

      {/* Sheet */}
      <motion.div
        variants={settingsVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`absolute bottom-0 left-0 right-0 rounded-t-2xl shadow-2xl ${
          isDark ? 'bg-surface-dark border-t border-border-dark' : 'bg-white border-t border-border-light'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-8 h-1 rounded-full ${isDark ? 'bg-border-dark' : 'bg-border-light'}`} />
        </div>

        <div className="px-6 pt-2 pb-8 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-sans font-semibold ${isDark ? 'text-text-dark' : 'text-text-light'}`}>
              Settings
            </h2>
            <button
              onClick={closeSettings}
              className={`p-1.5 rounded-lg ${isDark ? 'text-muted-dark hover:text-text-dark' : 'text-muted-light hover:text-text-light'}`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className={`divide-y ${isDark ? 'divide-border-dark' : 'divide-border-light'}`}>
            <SettingRow label="Theme" description="Dark or light appearance" isDark={isDark}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
                  {isDark ? 'Dark' : 'Light'}
                </span>
                <Toggle
                  checked={isDark}
                  onChange={(v) => updateSettings({ theme: v ? 'dark' : 'light' })}
                  isDark={isDark}
                />
              </div>
            </SettingRow>

            <SettingRow label="Sound effects" description="Chime on task completion" isDark={isDark}>
              <Toggle
                checked={settings.soundEnabled}
                onChange={(v) => updateSettings({ soundEnabled: v })}
                isDark={isDark}
              />
            </SettingRow>

            <SettingRow label="Daily reset time" description="When the board resets for a new day" isDark={isDark}>
              <select
                value={settings.dailyResetHourUTC ?? 10}
                onChange={(e) => updateSettings({ dailyResetHourUTC: Number(e.target.value) })}
                className={`px-2 py-1 rounded-lg text-xs font-sans transition-colors appearance-none cursor-pointer ${
                  isDark
                    ? 'bg-surface-dark text-text-dark border border-border-dark'
                    : 'bg-white text-text-light border border-border-light'
                }`}
              >
                {Array.from({ length: 24 }, (_, utcHour) => {
                  // Convert UTC hour to local time for display
                  const d = new Date()
                  d.setUTCHours(utcHour, 0, 0, 0)
                  const localStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                  return (
                    <option key={utcHour} value={utcHour}>
                      {localStr}
                    </option>
                  )
                })}
              </select>
            </SettingRow>

            <SettingRow label="Reset today's progress" description="Zero the counter without deleting completed tasks" isDark={isDark}>
              <button
                onClick={resetTodayProgress}
                className={`px-3 py-1 rounded-lg text-xs font-sans transition-colors ${
                  isDark
                    ? 'text-muted-dark hover:text-text-dark border border-border-dark hover:border-muted-dark'
                    : 'text-muted-light hover:text-text-light border border-border-light hover:border-muted-light'
                }`}
              >
                Reset
              </button>
            </SettingRow>

            <SettingRow label="Font size" isDark={isDark}>
              <div className="flex items-center gap-1">
                {['small', 'medium', 'large'].map(size => (
                  <button
                    key={size}
                    onClick={() => updateSettings({ fontSize: size })}
                    className={`px-3 py-1 rounded-lg text-xs font-sans capitalize transition-colors ${
                      settings.fontSize === size
                        ? 'bg-accent text-bg-dark font-medium'
                        : isDark
                          ? 'text-muted-dark hover:text-text-dark'
                          : 'text-muted-light hover:text-text-light'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow label="Developer mode" description="Allow deleting completed tasks (reverses XP)" isDark={isDark}>
              <Toggle
                checked={settings.developerMode ?? false}
                onChange={(v) => updateSettings({ developerMode: v })}
                isDark={isDark}
              />
            </SettingRow>
          </div>

          {/* Progression stats */}
          <div className={`mt-6 pt-4 border-t ${isDark ? 'border-border-dark' : 'border-border-light'}`}>
            <h3 className={`text-xs font-sans font-semibold tracking-widest uppercase mb-3 ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
              Progression
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
                  Rank
                </span>
                <span className="text-xs font-sans font-semibold" style={{ color: tierColor }}>
                  {rank.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
                  Total XP
                </span>
                <span className={`text-xs font-sans font-medium ${isDark ? 'text-text-dark' : 'text-text-light'}`}>
                  {progression.currentXP.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
                  Streak
                </span>
                <span className={`text-xs font-sans font-medium ${isDark ? 'text-text-dark' : 'text-text-light'}`}>
                  {progression.streakCount} day{progression.streakCount !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
                  Task slots
                </span>
                <span className={`text-xs font-sans font-medium ${isDark ? 'text-text-dark' : 'text-text-light'}`}>
                  {rank.taskSlots}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className={`text-xs font-sans ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}>
                  Reset progression
                </span>
                <button
                  onClick={handleResetProgression}
                  className={`px-3 py-1 rounded-lg text-xs font-sans transition-colors ${
                    confirmReset
                      ? 'text-red-400 border border-red-400/50 hover:bg-red-400/10'
                      : isDark
                        ? 'text-muted-dark hover:text-text-dark border border-border-dark hover:border-muted-dark'
                        : 'text-muted-light hover:text-text-light border border-border-light hover:border-muted-light'
                  }`}
                >
                  {confirmReset ? 'Confirm?' : 'Reset'}
                </button>
              </div>
            </div>
          </div>

          {/* Lifetime stat */}
          <div className={`mt-6 pt-4 text-center border-t ${isDark ? 'border-border-dark' : 'border-border-light'}`}>
            <p className={`text-xs font-sans tracking-widest uppercase ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-50`}>
              You've completed {settings.lifetimeCompleted} tasks
            </p>
          </div>

          {/* Hard Reset */}
          <div className={`mt-6 pt-4 border-t ${isDark ? 'border-border-dark' : 'border-border-light'}`}>
            <button
              onClick={handleHardReset}
              className={`w-full py-2.5 rounded-lg text-xs font-sans font-medium transition-colors ${
                confirmHardReset
                  ? 'bg-red-500/15 text-red-400 border border-red-400/50'
                  : isDark
                    ? 'text-muted-dark hover:text-red-400 border border-border-dark hover:border-red-400/30'
                    : 'text-muted-light hover:text-red-400 border border-border-light hover:border-red-400/30'
              }`}
            >
              {confirmHardReset ? 'Confirm full reset? This cannot be undone.' : 'Full Reset'}
            </button>
            <p className={`text-center text-xs font-sans mt-2 ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-40`}>
              Removes all tasks, progress, and resets everything
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
