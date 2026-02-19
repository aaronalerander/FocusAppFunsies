import { useState, useRef, useEffect, useCallback } from 'react'
import { getTagColor } from '../utils/tagColors'
import { RANK_COLORS } from '../utils/progression'
import { playTaskAdded } from '../hooks/useSound'

// ── Rank ↔ XP delta swap animation ────────────────────────────────────────
const RANK_HOLD_MS = 6400
const XP_HOLD_MS   = 4400
const TRANS_MS     = 400

const QE_SWAP_STYLE = `
  @keyframes qeShrinkOut {
    0%   { opacity: 1; transform: scale(1) translateY(0); }
    100% { opacity: 0; transform: scale(0.55) translateY(2px); }
  }
  @keyframes qeGrowIn {
    0%   { opacity: 0; transform: scale(0.55) translateY(2px); }
    65%  { opacity: 1; transform: scale(1.15) translateY(-1px); }
    82%  { transform: scale(0.93) translateY(0.5px); }
    92%  { transform: scale(1.05) translateY(-0.5px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes qeFadeOut {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.65); }
  }
`
if (typeof document !== 'undefined' && !document.getElementById('qe-swap-style')) {
  const s = document.createElement('style')
  s.id = 'qe-swap-style'
  s.textContent = QE_SWAP_STYLE
  document.head.appendChild(s)
}

export default function QuickEntryApp() {
  const [value, setValue] = useState('')
  const [tag, setTag] = useState(null)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [existingTags, setExistingTags] = useState([])
  const [tagFilter, setTagFilter] = useState('')
  const [activeTagIdx, setActiveTagIdx] = useState(-1)
  const [stats, setStats] = useState(null)
  const [committing, setCommitting] = useState(false) // confirmation animation state
  const inputRef = useRef(null)
  const tagInputRef = useRef(null)

  // Load existing tags and stats
  useEffect(() => {
    window.quickEntryAPI.tags.getAll()
      .then(tags => setExistingTags(tags || []))
      .catch(() => setExistingTags([]))
    window.quickEntryAPI.getStats()
      .then(s => setStats(s))
      .catch(() => {})
  }, [])

  // Global Escape key listener
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (showTagPicker) {
          closeTagPicker()
        } else {
          window.quickEntryAPI.hide()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showTagPicker])

  // Hide when the window loses focus (user clicked another app)
  useEffect(() => {
    const handler = () => window.quickEntryAPI.hide()
    window.addEventListener('blur', handler)
    return () => window.removeEventListener('blur', handler)
  }, [])

  // Listen for focus signal from main process
  useEffect(() => {
    return window.quickEntryAPI.onFocus(() => {
      inputRef.current?.focus()
      window.quickEntryAPI.tags.getAll()
        .then(tags => setExistingTags(tags || []))
        .catch(() => {})
      window.quickEntryAPI.getStats()
        .then(s => setStats(s))
        .catch(() => {})
    })
  }, [])

  // Listen for reset signal (panel hidden)
  useEffect(() => {
    return window.quickEntryAPI.onReset(() => {
      setValue('')
      setTag(null)
      setShowTagPicker(false)
      setTagFilter('')
      setActiveTagIdx(-1)
    })
  }, [])

  // Notify main process to resize window when tag picker opens/closes
  useEffect(() => {
    window.quickEntryAPI.resize(showTagPicker)
  }, [showTagPicker])

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

  const submit = useCallback(async () => {
    if (!value.trim()) return
    // Fire the add immediately — don't wait on animation
    window.quickEntryAPI.addTask(value.trim(), tag)
    playTaskAdded()
    // Play confirmation animation, then hide after it completes
    setCommitting(true)
    setTimeout(() => {
      setValue('')
      setTag(null)
      setCommitting(false)
      window.quickEntryAPI.hide()
    }, 420)
  }, [value, tag])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      if (showTagPicker) {
        closeTagPicker()
      } else {
        window.quickEntryAPI.hide()
      }
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      if (showTagPicker) {
        closeTagPicker()
      } else {
        openTagPicker()
      }
    }
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeTagPicker()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      closeTagPicker()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (activeTagIdx >= 0 && filteredTags[activeTagIdx]) {
        setTag(filteredTags[activeTagIdx])
      } else if (tagFilter.trim()) {
        setTag(tagFilter.trim())
      }
      closeTagPicker()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveTagIdx(i => Math.min(i + 1, filteredTags.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveTagIdx(i => Math.max(i - 1, -1))
    }
    if (e.key === 'Backspace' && tagFilter === '' && tag) {
      setTag(null)
    }
  }

  const filteredTags = tagFilter
    ? existingTags.filter(t => t.toLowerCase().includes(tagFilter.toLowerCase()))
    : existingTags

  const selectedColor = tag ? getTagColor(tag) : null

  const tierColor = stats ? (RANK_COLORS[stats.rankTier]?.primary || '#888') : '#888'

  // ── Rank ↔ XP delta phase machine ────────────────────────────────────────
  const [phase, setPhase] = useState('rank-show')
  const phaseTimer = useRef(null)

  useEffect(() => {
    function schedule(next, delay) {
      phaseTimer.current = setTimeout(() => run(next), delay)
    }
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

  const xpDelta  = stats?.xpDelta ?? 0
  const isNegXP  = xpDelta < 0
  const isZeroXP = xpDelta === 0
  const xpLabel  = isNegXP ? `${xpDelta} XP` : `+${xpDelta} XP`
  const xpColor  = isNegXP ? '#f87171' : isZeroXP ? '#555' : tierColor

  return (
    <div
      className={`w-full h-full flex flex-col justify-end items-center pb-2${committing ? ' qe-committing' : ''}`}
      style={{ '--qe-rank-color': tierColor }}
    >
      {/* Tag picker dropdown (above the bar) */}
      {showTagPicker && (
        <div
          className="mb-1.5 rounded-xl p-2 overflow-y-auto"
          style={{
            width: WIN_WIDTH - 16,
            maxHeight: 192,
            background: 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.08)',
          }}
        >
          <input
            ref={tagInputRef}
            value={tagFilter}
            onChange={e => { setTagFilter(e.target.value); setActiveTagIdx(-1) }}
            onKeyDown={handleTagKeyDown}
            placeholder="Type or pick a tag..."
            className="w-full bg-transparent outline-none text-xs font-sans px-1 py-1"
            style={{ color: '#e0e0e0' }}
          />
          {filteredTags.map((t, idx) => {
            const c = getTagColor(t)
            return (
              <div
                key={t}
                onMouseDown={(e) => {
                  e.preventDefault()
                  setTag(t)
                  closeTagPicker()
                }}
                onMouseEnter={() => setActiveTagIdx(idx)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs font-sans transition-colors"
                style={{
                  color: '#e0e0e0',
                  background: idx === activeTagIdx ? 'rgba(255,255,255,0.08)' : 'transparent',
                }}
              >
                <span
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ background: c.bg }}
                />
                {t}
              </div>
            )
          })}
          {filteredTags.length === 0 && tagFilter && (
            <div className="text-[11px] font-sans px-2 py-1" style={{ color: '#888' }}>
              Press Enter to create &ldquo;{tagFilter}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Combined floating bar + status strip */}
      <div
        className="qe-bar-shell overflow-hidden rounded-2xl"
        style={{
          width: WIN_WIDTH - 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.1)',
        }}
      >
        {/* Main input bar */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            background: 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Icon: "+" normally, checkmark on commit */}
          <div className="flex-shrink-0 relative" style={{ width: 14, height: 14 }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="qe-icon-plus absolute inset-0"
              style={{ color: '#666' }}
            >
              <path
                d="M7 1v12M1 7h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="qe-icon-check absolute inset-0"
              style={{ color: tierColor, opacity: 0 }}
            >
              <path
                d="M2 7.5l3.5 3.5 6.5-7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quick add task..."
            autoFocus
            disabled={committing}
            className="qe-task-text flex-1 bg-transparent text-sm font-sans outline-none"
            style={{ color: '#e0e0e0', caretColor: '#e0e0e0' }}
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
              style={{ color: '#555' }}
            >
              tab for tag
            </span>
          )}

          {value && (
            <span className="text-xs font-sans" style={{ color: '#555' }}>↵</span>
          )}
        </div>

        {/* Status strip — darker section behind/below the bar */}
        <div
          className="flex items-center justify-between px-4 py-1.5"
          style={{
            background: 'rgba(18, 18, 18, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Left: today's task progress */}
          <div className="flex items-center gap-1.5">
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              style={{ color: '#555' }}
            >
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
              {stats && stats.total > 0 && (
                <circle
                  cx="5"
                  cy="5"
                  r="4"
                  stroke={stats.completed === stats.total ? '#4ade80' : '#888'}
                  strokeWidth="1.2"
                  strokeDasharray={`${(stats.completed / stats.total) * 25.13} 25.13`}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                />
              )}
            </svg>
            <span className="text-[10px] font-sans" style={{ color: '#666' }}>
              {stats ? `${stats.completed}/${stats.total} today` : '–'}
            </span>
          </div>

          {/* Right: rank name ↔ XP delta */}
          <div className="flex items-center gap-1.5">
            {/* Tier dot */}
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              backgroundColor: tierColor,
              flexShrink: 0,
              boxShadow: `0 0 4px ${tierColor}99`,
              opacity: 0.85,
            }} />

            {/* Swap container */}
            <div style={{ position: 'relative', height: 13, minWidth: 56 }}>
              {/* Rank name */}
              <span
                style={{
                  position: 'absolute', left: 0, top: 0,
                  fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: tierColor,
                  whiteSpace: 'nowrap',
                  opacity: xpVisible ? 0 : 1,
                  animation:
                    phase === 'rank-out' ? `qeShrinkOut ${TRANS_MS}ms ease-in forwards` :
                    phase === 'rank-in'  ? `qeGrowIn ${TRANS_MS + 150}ms cubic-bezier(0.22,1,0.36,1) forwards` :
                    'none',
                }}
              >
                {stats ? stats.rankName : '–'}
              </span>

              {/* XP delta */}
              <span
                style={{
                  position: 'absolute', left: 0, top: 0,
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '-0.2px',
                  fontVariantNumeric: 'tabular-nums',
                  color: xpColor,
                  whiteSpace: 'nowrap',
                  opacity: rankVisible ? 0 : 1,
                  animation:
                    phase === 'xp-in'  ? `qeGrowIn ${TRANS_MS + 150}ms cubic-bezier(0.22,1,0.36,1) forwards` :
                    phase === 'xp-out' ? `qeFadeOut ${TRANS_MS}ms ease-in forwards` :
                    'none',
                }}
              >
                {xpLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const WIN_WIDTH = 580
