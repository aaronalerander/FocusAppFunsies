import { useEffect } from 'react'
import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'
import { settingsVariants } from '@/hooks/useAnimations'

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
  const updateSettings = useTaskStore(s => s.updateSettings)
  const resetTodayProgress = useTaskStore(s => s.resetTodayProgress)
  const closeSettings = useTaskStore(s => s.closeSettings)
  const isDark = settings.theme === 'dark'

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') closeSettings()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeSettings])

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

        <div className="px-6 pt-2 pb-8">
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

            <SettingRow label="Daily reset" description="Move uncompleted tasks to Later at midnight" isDark={isDark}>
              <Toggle
                checked={settings.dailyResetEnabled}
                onChange={(v) => updateSettings({ dailyResetEnabled: v })}
                isDark={isDark}
              />
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
          </div>

          {/* Lifetime stat */}
          <div className={`mt-6 pt-4 text-center border-t ${isDark ? 'border-border-dark' : 'border-border-light'}`}>
            <p className={`text-xs font-sans tracking-widest uppercase ${isDark ? 'text-muted-dark' : 'text-muted-light'} opacity-50`}>
              You've completed {settings.lifetimeCompleted} tasks
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
