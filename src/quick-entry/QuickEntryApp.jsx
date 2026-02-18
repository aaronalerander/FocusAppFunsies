import { useState, useRef, useEffect, useCallback } from 'react'
import { getTagColor } from '../utils/tagColors'
import { RANK_COLORS } from '../utils/progression'

export default function QuickEntryApp() {
  const [value, setValue] = useState('')
  const [tag, setTag] = useState(null)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [existingTags, setExistingTags] = useState([])
  const [tagFilter, setTagFilter] = useState('')
  const [activeTagIdx, setActiveTagIdx] = useState(-1)
  const [stats, setStats] = useState(null)
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
    await window.quickEntryAPI.addTask(value.trim(), tag)
    setValue('')
    setTag(null)
    window.quickEntryAPI.hide()
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

  return (
    <div className="w-full h-full flex flex-col justify-end items-center pb-2">
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
        className="overflow-hidden rounded-2xl"
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
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="flex-shrink-0"
            style={{ color: '#666' }}
          >
            <path
              d="M7 1v12M1 7h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quick add task..."
            autoFocus
            className="flex-1 bg-transparent text-sm font-sans outline-none"
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

          {/* Right: current rank */}
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-sans font-medium"
              style={{ color: tierColor }}
            >
              {stats ? stats.rankName : '–'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const WIN_WIDTH = 580
