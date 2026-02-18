import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getTagColor } from '@/utils/tagColors'

/**
 * Inline tag editor shown when the user clicks the tag area of a task.
 * Props:
 *   currentTag  – string | null
 *   isDark      – boolean
 *   onCommit    – (tagName: string | null) => void  called when user commits a tag
 *   onClose     – () => void  called when the input should close without committing
 */
export default function TagInput({ currentTag, isDark, onCommit, onClose }) {
  const [value, setValue] = useState(currentTag || '')
  const [existingTags, setExistingTags] = useState([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Load all existing tags once on mount
  useEffect(() => {
    async function load() {
      try {
        const tags = await window.focusAPI.tags.getAll()
        setExistingTags(tags || [])
      } catch {
        setExistingTags([])
      }
    }
    load()
  }, [])

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  const trimmed = value.trim()

  // Live-filter existing tags
  const suggestions = trimmed
    ? existingTags.filter(t => t.toLowerCase().includes(trimmed.toLowerCase()) && t.toLowerCase() !== trimmed.toLowerCase())
    : existingTags.filter(t => !currentTag || t !== currentTag)

  const commit = useCallback((tag) => {
    const normalized = tag && tag.trim() ? tag.trim() : null
    onCommit(normalized)
  }, [onCommit])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        commit(suggestions[activeIdx])
      } else {
        commit(trimmed || null)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Backspace' && value === '' && currentTag) {
      // Clear the tag
      commit(null)
    }
  }

  const handleChange = (e) => {
    setValue(e.target.value)
    setActiveIdx(-1)
  }

  const color = trimmed ? getTagColor(trimmed) : null

  return (
    <div ref={containerRef} className="relative flex-shrink-0" style={{ minWidth: 100 }}>
      {/* Input row */}
      <div
        className={`flex items-center gap-1 rounded px-2 py-0.5 border text-xs font-sans ${
          isDark
            ? 'bg-surface-dark border-border-dark'
            : 'bg-white border-border-light'
        }`}
        style={{ height: 22 }}
      >
        {/* Color preview dot */}
        {color && (
          <span
            className="w-2 h-2 rounded-sm flex-shrink-0"
            style={{ background: color.bg }}
          />
        )}
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="tag…"
          className={`bg-transparent outline-none w-20 text-xs font-sans ${
            isDark ? 'text-text-dark placeholder:text-muted-dark' : 'text-text-light placeholder:text-muted-light'
          }`}
          style={{ minWidth: 0 }}
        />
        {/* Clear button */}
        {value && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setValue('') }}
            className={`flex-shrink-0 opacity-50 hover:opacity-100 ${isDark ? 'text-muted-dark' : 'text-muted-light'}`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className={`absolute top-full left-0 mt-1 rounded-lg shadow-lg border z-50 overflow-hidden ${
              isDark
                ? 'bg-surface-dark border-border-dark'
                : 'bg-white border-border-light'
            }`}
            style={{ minWidth: 120 }}
          >
            {suggestions.map((tag, idx) => {
              const c = getTagColor(tag)
              const isActive = idx === activeIdx
              return (
                <div
                  key={tag}
                  onMouseDown={(e) => { e.preventDefault(); commit(tag) }}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs font-sans transition-colors ${
                    isActive
                      ? isDark ? 'bg-border-dark' : 'bg-surface-light'
                      : ''
                  } ${isDark ? 'text-text-dark' : 'text-text-light'}`}
                >
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ background: c.bg }}
                  />
                  {tag}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
