import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { settingsVariants } from '@/hooks/useAnimations'
import { getRankById, getXPProgress, getNextRank, RANK_COLORS } from '@/utils/progression'

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-accent' : 'bg-border-dark'
      }`}
    >
      <motion.div
        animate={{ x: checked ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute top-1 w-4 h-4 rounded-full shadow-sm ${
          checked ? 'bg-bg-dark' : 'bg-muted-dark'
        }`}
      />
    </button>
  )
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-sans font-medium text-text-dark">
          {label}
        </div>
        {description && (
          <div className="text-xs font-sans mt-0.5 text-muted-dark opacity-70">
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
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={closeSettings}
      />

      {/* Sheet — liquid glass */}
      <motion.div
        variants={settingsVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl shadow-2xl overflow-hidden"
        style={{
          // Liquid glass background
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          background: 'linear-gradient(180deg, rgba(28,28,28,0.92) 0%, rgba(18,18,18,0.96) 100%)',
          borderTop: '0.5px solid rgba(255,255,255,0.12)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-border-dark" />
        </div>

        <div className="px-6 pt-2 pb-8 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-sans font-semibold text-text-dark">
              Settings
            </h2>
            <button
              onClick={closeSettings}
              className="p-1.5 rounded-lg text-muted-dark hover:text-text-dark"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="divide-y divide-border-dark">
            <SettingRow label="Sound effects" description="Chime on task completion">
              <Toggle
                checked={settings.soundEnabled}
                onChange={(v) => updateSettings({ soundEnabled: v })}
              />
            </SettingRow>

            <SettingRow label="Drain notifications" description="Alerts when XP bleed rate escalates">
              <Toggle
                checked={settings.notificationsEnabled ?? true}
                onChange={(v) => updateSettings({ notificationsEnabled: v })}
              />
            </SettingRow>

            <SettingRow label="Daily reset time" description="When the board resets for a new day">
              <select
                value={settings.dailyResetHourUTC ?? 10}
                onChange={(e) => updateSettings({ dailyResetHourUTC: Number(e.target.value) })}
                className="px-2 py-1 rounded-lg text-xs font-sans transition-colors appearance-none cursor-pointer bg-surface-dark text-text-dark border border-border-dark"
              >
                {Array.from({ length: 24 }, (_, utcHour) => {
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

            <SettingRow label="Reset today's progress" description="Zero the counter without deleting completed tasks">
              <button
                onClick={resetTodayProgress}
                className="px-3 py-1 rounded-lg text-xs font-sans transition-colors text-muted-dark hover:text-text-dark border border-border-dark hover:border-muted-dark"
              >
                Reset
              </button>
            </SettingRow>

            <SettingRow label="Font size">
              <div className="flex items-center gap-1">
                {['small', 'medium', 'large'].map(size => (
                  <button
                    key={size}
                    onClick={() => updateSettings({ fontSize: size })}
                    className={`px-3 py-1 rounded-lg text-xs font-sans capitalize transition-colors ${
                      settings.fontSize === size
                        ? 'bg-accent text-bg-dark font-medium'
                        : 'text-muted-dark hover:text-text-dark'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow label="Developer mode" description="Allow deleting completed tasks (reverses XP)">
              <Toggle
                checked={settings.developerMode ?? false}
                onChange={(v) => updateSettings({ developerMode: v })}
              />
            </SettingRow>
          </div>

          {/* Progression stats */}
          <div className="mt-6 pt-4 border-t border-border-dark">
            <h3 className="text-xs font-sans font-semibold tracking-widest uppercase mb-3 text-muted-dark">
              Progression
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-sans text-muted-dark">
                  Rank
                </span>
                <span className="text-xs font-sans font-semibold" style={{ color: tierColor }}>
                  {rank.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-sans text-muted-dark">
                  Total XP
                </span>
                <span className="text-xs font-sans font-medium text-text-dark">
                  {progression.currentXP.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-sans text-muted-dark">
                  Streak
                </span>
                <span className="text-xs font-sans font-medium text-text-dark">
                  {progression.streakCount} day{progression.streakCount !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-sans text-muted-dark">
                  Task slots
                </span>
                <span className="text-xs font-sans font-medium text-text-dark">
                  {rank.taskSlots}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-sans text-muted-dark">
                  Reset progression
                </span>
                <button
                  onClick={handleResetProgression}
                  className={`px-3 py-1 rounded-lg text-xs font-sans transition-colors ${
                    confirmReset
                      ? 'text-red-400 border border-red-400/50 hover:bg-red-400/10'
                      : 'text-muted-dark hover:text-text-dark border border-border-dark hover:border-muted-dark'
                  }`}
                >
                  {confirmReset ? 'Confirm?' : 'Reset'}
                </button>
              </div>
            </div>
          </div>

          {/* Lifetime stat */}
          <div className="mt-6 pt-4 text-center border-t border-border-dark">
            <p className="text-xs font-sans tracking-widest uppercase text-muted-dark opacity-50">
              You've completed {settings.lifetimeCompleted} tasks
            </p>
          </div>

          {/* Hard Reset */}
          <div className="mt-6 pt-4 border-t border-border-dark">
            <button
              onClick={handleHardReset}
              className={`w-full py-2.5 rounded-lg text-xs font-sans font-medium transition-colors ${
                confirmHardReset
                  ? 'bg-red-500/15 text-red-400 border border-red-400/50'
                  : 'text-muted-dark hover:text-red-400 border border-border-dark hover:border-red-400/30'
              }`}
            >
              {confirmHardReset ? 'Confirm full reset? This cannot be undone.' : 'Full Reset'}
            </button>
            <p className="text-center text-xs font-sans mt-2 text-muted-dark opacity-40">
              Removes all tasks, progress, and resets everything
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
