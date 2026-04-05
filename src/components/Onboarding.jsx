import { motion } from 'framer-motion'
import useTaskStore from '@/store/tasks'

const ACCENT = '#C8F135'

const rules = [
  {
    title: 'Build your daily board',
    body: "Add tasks to Today — these are the things you're committing to getting done. Use Later as your backlog for everything else.",
  },
  {
    title: 'Complete tasks, earn XP',
    body: "Every task you finish awards XP. Rack up enough and you'll rank up — from Bronze all the way through to Predator. The more you do, the higher you climb.",
  },
  {
    title: 'Every task hides a secret multiplier',
    body: "When you complete a task, a slot machine reveals a hidden XP multiplier. Most pulls are standard. Some are warm. A few are hot. You never know what you're going to get.",
  },
  {
    title: 'Clear the board, build a streak',
    body: "Finish every task on your board before the daily reset and you've cleared it. Do that multiple days in a row and your streak grows — boosting your XP multiplier each time.",
  },
  {
    title: 'Go idle and your XP bleeds',
    body: "Focus doesn't let you coast. If you're not completing tasks, your XP slowly bleeds away. Clear your board each day to stop the bleed and lock in your rank.",
  },
]

export default function Onboarding() {
  const completeOnboarding = useTaskStore(s => s.completeOnboarding)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg-dark"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="flex-1 overflow-y-auto px-8 pt-14 pb-6">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#EDEDED',
            margin: 0,
            marginBottom: 16,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
          }}
        >
          Welcome to Focus
        </motion.h1>

        {/* Intro */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            fontSize: 18,
            lineHeight: 1.65,
            color: '#EDEDED',
            fontWeight: 400,
            marginBottom: 40,
          }}
        >
          Focus is a task app built around one idea: productivity should feel rewarding.
          Complete your daily tasks, earn XP, rank up, and protect your progress — or watch it bleed away.
          The rules are simple.
        </motion.p>

        {/* Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {rules.map((rule, i) => (
            <motion.div
              key={rule.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.09 }}
              style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}
            >
              {/* Number badge */}
              <div
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `2px solid ${ACCENT}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: ACCENT,
                  marginTop: 2,
                }}
              >
                {i + 1}
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#EDEDED', margin: 0, marginBottom: 6, lineHeight: 1.3 }}>
                  {rule.title}
                </p>
                <p style={{ fontSize: 15, fontWeight: 400, color: '#888888', margin: 0, lineHeight: 1.65 }}>
                  {rule.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        style={{ padding: '16px 32px 40px' }}
      >
        <button
          onClick={completeOnboarding}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 12,
            border: 'none',
            background: ACCENT,
            color: '#0F0F0F',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'inherit',
            letterSpacing: '0.01em',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          onMouseDown={e => e.currentTarget.style.opacity = '0.65'}
          onMouseUp={e => e.currentTarget.style.opacity = '0.85'}
        >
          Get started
        </button>
      </motion.div>
    </div>
  )
}
