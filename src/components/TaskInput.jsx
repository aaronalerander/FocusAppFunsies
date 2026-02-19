import { useState, useRef, useEffect, useCallback } from 'react'
import useTaskStore from '@/store/tasks'
import { getTagColor } from '@/utils/tagColors'
import { getRankById, RANK_COLORS } from '@/utils/progression'
import { getResetTimestamp } from '@/utils/dateUtils'
import { playTaskAdded } from '@/hooks/useSound'

// ── Rank ↔ XP delta swap — same constants as QuickEntryApp ────────────────
const RANK_HOLD_MS = 6400
const XP_HOLD_MS   = 4400
const TRANS_MS     = 400

// Inject keyframes once (shared id avoids double-injection if QE is also loaded)
const TI_SWAP_STYLE = `
  @keyframes tiShrinkOut {
    0%   { opacity: 1; transform: scale(1) translateY(0); }
    100% { opacity: 0; transform: scale(0.55) translateY(2px); }
  }
  @keyframes tiGrowIn {
    0%   { opacity: 0; transform: scale(0.55) translateY(2px); }
    65%  { opacity: 1; transform: scale(1.15) translateY(-1px); }
    82%  { transform: scale(0.93) translateY(0.5px); }
    92%  { transform: scale(1.05) translateY(-0.5px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes tiGrowIn {
    0%   { opacity: 0; transform: scale(0.55) translateY(2px); }
    65%  { opacity: 1; transform: scale(1.15) translateY(-1px); }
    82%  { transform: scale(0.93) translateY(0.5px); }
    92%  { transform: scale(1.05) translateY(-0.5px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes tiFadeOut {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.65); }
  }
  /* commit animations — mirror QE bar */
  @keyframes ti-commit {
    0%   { opacity: 1;   transform: translateY(0)    scale(1); }
    60%  { opacity: 0.6; transform: translateY(-6px)  scale(0.97); }
    100% { opacity: 0;   transform: translateY(-14px) scale(0.94); }
  }
  @keyframes ti-icon-out {
    0%   { opacity: 1; transform: scale(1) rotate(0deg); }
    100% { opacity: 0; transform: scale(0.4) rotate(45deg); }
  }
  @keyframes ti-check-in {
    0%   { opacity: 0; transform: scale(0.3) rotate(-20deg); }
    60%  { opacity: 1; transform: scale(1.2) rotate(4deg); }
    100% { opacity: 1; transform: scale(1)   rotate(0deg); }
  }
  @keyframes ti-glow {
    0%   { box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.08); }
    35%  { box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 1.5px var(--ti-rank-color), 0 0 18px color-mix(in srgb, var(--ti-rank-color) 40%, transparent); }
    100% { box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.08); }
  }
  .ti-committing .ti-task-text { animation: ti-commit   0.35s cubic-bezier(0.4,0,0.2,1) forwards; }
  .ti-committing .ti-icon-plus { animation: ti-icon-out 0.2s  ease-in forwards; }
  .ti-committing .ti-icon-check { animation: ti-check-in 0.3s cubic-bezier(0.34,1.56,0.64,1) 0.05s forwards; }
  .ti-committing .ti-bar-shell  { animation: ti-glow     0.55s ease-out forwards; }
`
if (typeof document !== 'undefined' && !document.getElementById('ti-swap-style')) {
  const s = document.createElement('style')
  s.id = 'ti-swap-style'
  s.textContent = TI_SWAP_STYLE
  document.head.appendChild(s)
}

export default function TaskInput() {
  const addTask      = useTaskStore(s => s.addTask)
  const progression  = useTaskStore(s => s.progression)
  const tasks        = useTaskStore(s => s.tasks)
  const settings     = useTaskStore(s => s.settings)
  const activeTab    = useTaskStore(s => s.ui.activeTab)
  const soundEnabled = settings.soundEnabled
  const isDark       = settings.theme === 'dark'

  const placeholder = activeTab === 'later' ? 'Add to up next...' : 'What needs to happen today?'

  const [value, setValue]           = useState('')
  const [tag, setTag]               = useState(null)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [existingTags, setExistingTags]   = useState([])
  const [tagFilter, setTagFilter]   = useState('')
  const [activeTagIdx, setActiveTagIdx]   = useState(-1)
  const [committing, setCommitting] = useState(false)

  const inputRef    = useRef(null)
  const tagInputRef = useRef(null)

  // Load tags on mount
  useEffect(() => {
    window.focusAPI.tasks.readAll()
      .then(all => {
        const tags = [...new Set((all || []).map(t => t.tag).filter(Boolean))]
        setExistingTags(tags)
      })
      .catch(() => {})
  }, [tasks]) // refresh when tasks change

  // Focus input from quick-entry shortcut
  useEffect(() => {
    if (window.focusAPI.onFocusTaskInput) {
      return window.focusAPI.onFocusTaskInput(() => inputRef.current?.focus())
    }
  }, [])

  // Auto-focus on typing anywhere
  useEffect(() => {
    const handler = (e) => {
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.length !== 1) return
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Tag picker helpers ──────────────────────────────────────────────────
  const openTagPicker = useCallback(() => {
    setShowTagPicker(true)
    setTimeout(() => tagInputRef.current?.focus(), 50)
  }, [])

  const closeTagPicker = useCallback(() => {
    setShowTagPicker(false)
    setTagFilter('')
    setActiveTagIdx(-1)
    inputRef.current?.focus()
  }, [])

  const filteredTags = tagFilter
    ? existingTags.filter(t => t.toLowerCase().includes(tagFilter.toLowerCase()))
    : existingTags

  // ── Submit with commit animation ────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!value.trim() || committing) return
    setCommitting(true)
    if (soundEnabled) playTaskAdded()
    setTimeout(() => {
      addTask(value.trim())   // addTask handles tag via store; we pass tag separately below
      setValue('')
      setTag(null)
      setCommitting(false)
    }, 420)
  }, [value, committing, soundEnabled, addTask])

  // addTask in the store doesn't accept a tag param; call update after
  const submitWithTag = useCallback(async () => {
    if (!value.trim() || committing) return
    setCommitting(true)
    if (soundEnabled) playTaskAdded()
    const text = value.trim()
    const taskTag = tag
    setTimeout(async () => {
      await addTask(text)
      // If a tag was selected, apply it to the most recently added today/later task
      if (taskTag) {
        const all = await window.focusAPI.tasks.readAll()
        const match = [...(all || [])].reverse().find(t => t.text === text)
        if (match) await window.focusAPI.tasks.update(match.id, { tag: taskTag })
      }
      setValue('')
      setTag(null)
      setCommitting(false)
    }, 420)
  }, [value, tag, committing, soundEnabled, addTask])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitWithTag()
    }
    if (e.key === 'Escape') {
      setValue('')
      setTag(null)
      inputRef.current?.blur()
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      showTagPicker ? closeTagPicker() : openTagPicker()
    }
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeTagPicker(); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (activeTagIdx >= 0 && filteredTags[activeTagIdx]) setTag(filteredTags[activeTagIdx])
      else if (tagFilter.trim()) setTag(tagFilter.trim())
      closeTagPicker()
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveTagIdx(i => Math.min(i + 1, filteredTags.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveTagIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Backspace' && tagFilter === '' && tag) setTag(null)
  }

  // ── Rank / XP delta swap ────────────────────────────────────────────────
  const rank      = getRankById(progression.currentRankId)
  const tierColor = RANK_COLORS[rank.tier]?.primary || '#888'

  const dailyXPEarned = (() => {
    const resetBoundary = getResetTimestamp(settings.dailyResetHourUTC ?? 10)
    return tasks
      .filter(t => t.status === 'done' && t.completedAt && t.completedAt > resetBoundary)
      .reduce((sum, t) => sum + (t.final_xp_awarded || 0), 0)
  })()
  const xpDelta  = dailyXPEarned - (progression.dailyBleedTotal || 0)
  const isNegXP  = xpDelta < 0
  const isZeroXP = xpDelta === 0
  const xpLabel  = isNegXP ? `${xpDelta} XP` : `+${xpDelta} XP`
  const xpColor  = isNegXP ? '#f87171' : isZeroXP ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)') : tierColor

  const [phase, setPhase] = useState('rank-show')
  const phaseTimer = useRef(null)
  useEffect(() => {
    function schedule(next, delay) { phaseTimer.current = setTimeout(() => run(next), delay) }
    function run(p) {
      setPhase(p)
      switch (p) {
        case 'rank-show': schedule('rank-out',  RANK_HOLD_MS); break
        case 'rank-out':  schedule('xp-in',     TRANS_MS);     break
        case 'xp-in':     schedule('xp-show',   TRANS_MS + 150); break
        case 'xp-show':   schedule('xp-out',    XP_HOLD_MS);   break
        case 'xp-out':    schedule('rank-in',   TRANS_MS);     break
        case 'rank-in':   schedule('rank-show', TRANS_MS + 150); break
      }
    }
    run('rank-show')
    return () => clearTimeout(phaseTimer.current)
  }, [])

  const rankVisible = phase === 'rank-show' || phase === 'rank-out' || phase === 'rank-in'
  const xpVisible   = phase === 'xp-in'    || phase === 'xp-show'  || phase === 'xp-out'

  const selectedColor = tag ? getTagColor(tag) : null

  // Shell background matching QE bar tone, respecting theme
  const shellBg   = isDark ? 'rgba(30,30,30,0.97)' : 'rgba(245,245,245,0.97)'
  const textColor = isDark ? '#e0e0e0' : '#1a1a1a'
  const mutedColor = isDark ? '#555' : '#aaa'

  return (
    <div
      className="mx-6 mt-2 mb-4 flex justify-center"
      style={{ '--ti-rank-color': tierColor }}
    >
    <div className="w-full" style={{ maxWidth: 620 }}>
      {/* Tag picker — floats above the bar */}
      {showTagPicker && (
        <div
          className="mb-1.5 rounded-xl p-2 overflow-y-auto"
          style={{
            maxHeight: 192,
            background: isDark ? 'rgba(30,30,30,0.97)' : 'rgba(245,245,245,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.08)'
              : '0 8px 32px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.08)',
          }}
        >
          <input
            ref={tagInputRef}
            value={tagFilter}
            onChange={e => { setTagFilter(e.target.value); setActiveTagIdx(-1) }}
            onKeyDown={handleTagKeyDown}
            placeholder="Type or pick a tag..."
            className="w-full bg-transparent outline-none text-xs font-sans px-1 py-1"
            style={{ color: textColor }}
          />
          {filteredTags.map((t, idx) => {
            const c = getTagColor(t)
            return (
              <div
                key={t}
                onMouseDown={e => { e.preventDefault(); setTag(t); closeTagPicker() }}
                onMouseEnter={() => setActiveTagIdx(idx)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs font-sans transition-colors"
                style={{
                  color: textColor,
                  background: idx === activeTagIdx ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
                }}
              >
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: c.bg }} />
                {t}
              </div>
            )
          })}
          {filteredTags.length === 0 && tagFilter && (
            <div className="text-[11px] font-sans px-2 py-1" style={{ color: mutedColor }}>
              Press Enter to create &ldquo;{tagFilter}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Bar shell — matches QE proportions exactly */}
      <div
        className={`ti-bar-shell overflow-hidden rounded-2xl${committing ? ' ti-committing' : ''}`}
        style={{
          boxShadow: isDark
            ? '0 4px 16px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.08)'
            : '0 4px 16px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.08)',
        }}
      >
        {/* Main input row */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            background: shellBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Icon: + / ✓ */}
          <div className="flex-shrink-0 relative" style={{ width: 14, height: 14 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              className="ti-icon-plus absolute inset-0"
              style={{ color: mutedColor }}
            >
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              className="ti-icon-check absolute inset-0"
              style={{ color: tierColor, opacity: 0 }}
            >
              <path d="M2 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={committing}
            className="ti-task-text flex-1 bg-transparent text-sm font-sans outline-none placeholder:opacity-40 no-drag"
            style={{ color: textColor, caretColor: textColor }}
          />

          {/* Tag pill or hint */}
          {tag ? (
            <span
              onClick={openTagPicker}
              className="px-2 py-0.5 rounded text-[11px] font-sans font-medium cursor-pointer whitespace-nowrap flex-shrink-0"
              style={{ background: selectedColor.bg, color: selectedColor.text }}
            >
              {tag}
            </span>
          ) : (
            <span
              onClick={openTagPicker}
              className="text-[11px] font-sans cursor-pointer whitespace-nowrap flex-shrink-0"
              style={{ color: mutedColor }}
            >
              tab for tag
            </span>
          )}

          {value && (
            <span className="text-xs font-sans flex-shrink-0" style={{ color: mutedColor }}>↵</span>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}
