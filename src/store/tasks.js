import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { playCompletionSound } from '@/hooks/useSound'

const useTaskStore = create((set, get) => ({
  tasks: [],
  settings: {
    theme: 'dark',
    soundEnabled: true,
    fontSize: 'medium',
    dailyResetEnabled: false,
    lifetimeCompleted: 0,
    lastResetDate: null,
    progressResetAt: null
  },
  ui: {
    activeTab: 'today',
    isSettingsOpen: false,
    confirmDeleteId: null,
    completingTaskId: null,
    confetti: null,  // null | { mode: 'normal'|'jackpot'|'allDone', id: number }
    streakMessage: null,
    isLoaded: false
  },

  // ── Selectors ──────────────────────────────────────────────────

  todayTasks: () =>
    get().tasks
      .filter(t => t.status === 'today')
      .sort((a, b) => a.order - b.order),

  laterTasks: () =>
    get().tasks
      .filter(t => t.status === 'later')
      .sort((a, b) => a.order - b.order),

  doneTasks: () =>
    get().tasks
      .filter(t => t.status === 'done')
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),

  todayProgress: () => {
    const today = new Date().toISOString().split('T')[0]
    const resetAt = get().settings.progressResetAt  // ISO timestamp | null

    const allTodayTasks = get().tasks.filter(t => {
      if (t.status === 'today') return true
      if (t.status === 'done' && t.completedAt && t.completedAt.startsWith(today)) {
        // Exclude tasks completed before the last progress reset
        if (resetAt && t.completedAt <= resetAt) return false
        return true
      }
      return false
    })

    const done = allTodayTasks.filter(t => t.status === 'done')
    return {
      completed: done.length,
      total: allTodayTasks.length,
      percentage: allTodayTasks.length > 0 ? (done.length / allTodayTasks.length) * 100 : 0,
      allDone: allTodayTasks.length > 0 && done.length === allTodayTasks.length
    }
  },

  // ── Init ───────────────────────────────────────────────────────

  initialize: async () => {
    try {
      if (!window.focusAPI) {
        console.error('focusAPI not available on window — preload not connected')
        set(state => ({ ui: { ...state.ui, isLoaded: true } }))
        return
      }
      const [tasks, settings] = await Promise.all([
        window.focusAPI.tasks.readAll(),
        window.focusAPI.settings.read()
      ])
      set({
        tasks: tasks || [],
        settings: { ...get().settings, ...(settings || {}) },
        ui: { ...get().ui, isLoaded: true }
      })
    } catch (err) {
      console.error('Failed to initialize Focus store:', err)
      set(state => ({ ui: { ...state.ui, isLoaded: true } }))
    }
  },

  // ── Task actions ───────────────────────────────────────────────

  addTask: async (text) => {
    if (!text.trim()) return
    const { activeTab } = get().ui
    const tasks = get().tasks
    const targetStatus = activeTab === 'later' ? 'later' : 'today'
    const statusCount = tasks.filter(t => t.status === targetStatus).length

    const task = {
      id: uuidv4(),
      text: text.trim(),
      status: targetStatus,
      createdAt: new Date().toISOString(),
      completedAt: null,
      movedToLaterAt: null,
      order: statusCount
    }

    set(state => ({ tasks: [...state.tasks, task] }))
    await window.focusAPI.tasks.add(task)
  },

  completeTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task || task.status === 'done') return

    const completedAt = new Date().toISOString()
    const changes = { status: 'done', completedAt }

    set(state => ({
      ui: { ...state.ui, completingTaskId: id }
    }))

    // Optimistic update
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...changes } : t)
    }))

    // Persist and increment lifetime counter, then fire confetti
    try {
      await window.focusAPI.tasks.update(id, changes)

      const newLifetime = await window.focusAPI.lifetime.increment()
      set(state => ({
        settings: { ...state.settings, lifetimeCompleted: newLifetime }
      }))

      get().checkMilestones(newLifetime)

      // Determine confetti mode — priority: allDone > jackpot > normal
      const progress = get().todayProgress()
      const isAllDone = progress.allDone && progress.total > 0
      const isJackpot = newLifetime > 0 && newLifetime % 3 === 0
      const mode = isAllDone ? 'allDone' : isJackpot ? 'jackpot' : 'normal'

      // Sound scales with tasks completed today, independent of confetti mode
      if (get().settings.soundEnabled) playCompletionSound(progress.completed, isAllDone)

      setTimeout(() => {
        set(state => ({ ui: { ...state.ui, confetti: { mode, id: Date.now() } } }))
      }, 600)
    } catch (err) {
      console.error('[completeTask] IPC error, firing confetti with fallback lifetime:', err)

      const fallbackLifetime = (get().settings.lifetimeCompleted || 0) + 1
      set(state => ({
        settings: { ...state.settings, lifetimeCompleted: fallbackLifetime }
      }))

      const progress = get().todayProgress()
      const isAllDone = progress.allDone && progress.total > 0
      const isJackpot = fallbackLifetime > 0 && fallbackLifetime % 3 === 0
      const mode = isAllDone ? 'allDone' : isJackpot ? 'jackpot' : 'normal'

      if (get().settings.soundEnabled) playCompletionSound(progress.completed, isAllDone)

      setTimeout(() => {
        set(state => ({ ui: { ...state.ui, confetti: { mode, id: Date.now() } } }))
      }, 600)
    }

    // Clear completing state after animation
    setTimeout(() => {
      set(state => ({ ui: { ...state.ui, completingTaskId: null } }))
    }, 800)
  },

  checkMilestones: (lifetimeCount) => {
    let message = null
    if (lifetimeCount > 0 && lifetimeCount % 10 === 0) {
      message = '10tasks'
    } else if (lifetimeCount > 0 && lifetimeCount % 5 === 0) {
      message = '5tasks'
    }
    if (message) {
      set(state => ({ ui: { ...state.ui, streakMessage: message } }))
      setTimeout(() => {
        set(state => ({ ui: { ...state.ui, streakMessage: null } }))
      }, 3000)
    }
  },

  moveTask: async (id, targetStatus) => {
    const changes = {
      status: targetStatus,
      movedToLaterAt: targetStatus === 'later' ? new Date().toISOString() : null
    }
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...changes } : t)
    }))
    await window.focusAPI.tasks.update(id, changes)
  },

  deleteTask: async (id) => {
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== id),
      ui: { ...state.ui, confirmDeleteId: null }
    }))
    await window.focusAPI.tasks.delete(id)
  },

  reorderTasks: async (orderedIds) => {
    set(state => ({
      tasks: state.tasks.map(t => {
        const idx = orderedIds.indexOf(t.id)
        return idx !== -1 ? { ...t, order: idx } : t
      })
    }))
    await window.focusAPI.tasks.reorder(orderedIds)
  },

  // ── UI actions ─────────────────────────────────────────────────

  setTab: (tab) => set(state => ({ ui: { ...state.ui, activeTab: tab } })),
  openSettings: () => set(state => ({ ui: { ...state.ui, isSettingsOpen: true } })),
  closeSettings: () => set(state => ({ ui: { ...state.ui, isSettingsOpen: false } })),
  confirmDelete: (id) => set(state => ({ ui: { ...state.ui, confirmDeleteId: id } })),
  cancelDelete: () => set(state => ({ ui: { ...state.ui, confirmDeleteId: null } })),

  resetTodayProgress: async () => {
    const resetAt = await window.focusAPI.progress.reset()
    set(state => ({ settings: { ...state.settings, progressResetAt: resetAt } }))
  },

  updateSettings: async (changes) => {
    set(state => ({ settings: { ...state.settings, ...changes } }))
    await window.focusAPI.settings.update(changes)
  }
}))

export default useTaskStore
