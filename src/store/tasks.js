import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import {
  playCompletionSoundByTier,
  playTaskAdded,
  playBleedTick,
  playBleedCapHit,
  playDailyReset,
} from '@/hooks/useSound'
import {
  calculateTaskXP,
  calculateTaskXPWithMultiplier,
  rollHiddenMultiplier,
  getMultiplierTier,
  getStreakMultiplier,
  getRankForXP,
  getRankById,
  getNextRank,
  calculateDayXP
} from '@/utils/progression'
import { getLogicalToday, getResetTimestamp } from '@/utils/dateUtils'

const useTaskStore = create((set, get) => ({
  tasks: [],
  settings: {
    theme: 'dark',
    soundEnabled: true,
    fontSize: 'medium',
    dailyResetEnabled: false,
    lifetimeCompleted: 0,
    lastResetDate: null,
    progressResetAt: null,
    dailyResetHourUTC: 10,
    developerMode: false,
  },
  progression: {
    currentXP: 0,
    currentRankId: 'bronze_4',
    streakCount: 0,
    streakLastDate: null,
    boardClearedToday: false,
    tasksCompletedToday: 0,
    freeXPTaskIds: [],
    pendingDerank: null,
    dailyBleedTotal: 0,
    bleedCapHitToday: false,
    bleedActive: true,
    dailyModifierType: 'standard',
  },
  ui: {
    activeTab: 'today',
    isSettingsOpen: false,
    confirmDeleteId: null,
    completingTaskId: null,
    confetti: null,  // null | { mode: 'normal'|'jackpot'|'allDone', id: number }
    streakMessage: null,
    isLoaded: false,
    toast: null,              // { message, type: 'info'|'warning'|'success', id }
    xpSummary: null,          // XP summary overlay data
    rankUpAnimation: null,    // { fromRankId, toRankId, newSlots }
    slotMachine: null,        // { tier, value, color, label, xpAmount, taskText, taskId } | null
    pendingSlotMachineResolve: null,  // function | null — resolved when slot machine animation completes
    lastTaskMoment: false,    // true when exactly 1 task remains on Today (not in free XP round)
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
    const resetHour = get().settings.dailyResetHourUTC ?? 10
    const resetBoundary = getResetTimestamp(resetHour)

    const allTodayTasks = get().tasks.filter(t => {
      if (t.status === 'today') return true
      // Count done tasks completed AFTER the most recent daily reset
      if (t.status === 'done' && t.completedAt && t.completedAt > resetBoundary) {
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

  taskSlots: () => {
    const rank = getRankById(get().progression.currentRankId)
    return rank.taskSlots
  },

  currentRank: () => getRankById(get().progression.currentRankId),

  // ── Init ───────────────────────────────────────────────────────

  initialize: async () => {
    try {
      if (!window.focusAPI) {
        console.error('focusAPI not available on window — preload not connected')
        set(state => ({ ui: { ...state.ui, isLoaded: true } }))
        return
      }
      const [tasks, settings, progression] = await Promise.all([
        window.focusAPI.tasks.readAll(),
        window.focusAPI.settings.read(),
        window.focusAPI.progression.read()
      ])
      set({
        tasks: tasks || [],
        settings: { ...get().settings, ...(settings || {}) },
        progression: { ...get().progression, ...(progression || {}) },
        ui: { ...get().ui, isLoaded: true }
      })

      // Check for pending derank notification from overnight penalty
      if (progression?.pendingDerank) {
        const derank = progression.pendingDerank
        const fromRank = getRankById(derank.fromRankId)
        const toRank = getRankById(derank.toRankId)
        setTimeout(() => {
          get().showToast(`Dropped to ${toRank.name} (-${derank.xpLost} XP)`, 'warning')
        }, 1000)
        await window.focusAPI.progression.clearDerank()
        set(state => ({ progression: { ...state.progression, pendingDerank: null } }))
      }

      // Listen for daily reset events (fires at 5 AM EST or on app re-activate)
      if (window.focusAPI.onDailyReset) {
        window.focusAPI.onDailyReset(async () => {
          const [newTasks, newSettings, newProgression] = await Promise.all([
            window.focusAPI.tasks.readAll(),
            window.focusAPI.settings.read(),
            window.focusAPI.progression.read()
          ])
          set({
            tasks: newTasks || [],
            settings: { ...get().settings, ...(newSettings || {}) },
            progression: { ...get().progression, ...(newProgression || {}) },
          })
          if (get().settings.soundEnabled) playDailyReset()
        })
      }

      // Listen for bleed tick events pushed from the main process every 60 seconds.
      // Updates XP and rank silently — no demotion animation per PRD spec.
      if (window.focusAPI.onBleedTick) {
        window.focusAPI.onBleedTick((data) => {
          const prevCapHit = get().progression.bleedCapHitToday
          set(state => ({
            progression: {
              ...state.progression,
              currentXP: data.newXP,
              currentRankId: data.newRankId,
              dailyBleedTotal: data.dailyBleedTotal,
              bleedCapHitToday: data.capHit,
              bleedActive: data.bleedActive,
            }
          }))
          // Sound: near-silent bleed awareness (coffee-shop inaudible)
          if (get().settings.soundEnabled) {
            if (data.capHit && !prevCapHit) playBleedCapHit()
            else if (data.dailyBleedTotal > 0) playBleedTick()
          }
        })
      }

      // Listen for tasks added from the quick-entry panel
      if (window.focusAPI.onTaskAddedExternally) {
        window.focusAPI.onTaskAddedExternally((task) => {
          set(state => ({ tasks: [...state.tasks, task] }))
        })
      }
    } catch (err) {
      console.error('Failed to initialize Focus store:', err)
      set(state => ({ ui: { ...state.ui, isLoaded: true } }))
    }
  },

  // ── Task actions ───────────────────────────────────────────────

  addTask: async (text) => {
    if (!text.trim()) return
    const tasks = get().tasks

    // Always add to Later by default, unless both Later and Today are empty
    const laterCount = tasks.filter(t => t.status === 'later').length
    const todayCount = tasks.filter(t => t.status === 'today').length
    const maxSlots = get().taskSlots()
    let targetStatus = (laterCount === 0 && todayCount === 0) ? 'today' : 'later'

    // Slot limit enforcement for Today
    if (targetStatus === 'today') {
      if (todayCount >= maxSlots) {
        targetStatus = 'later'
      }
    }

    // Toast when task lands in Later because Today is full
    if (targetStatus === 'later' && todayCount >= maxSlots) {
      get().showToast('Max tasks for today — finish shit to unlock more slots', 'warning')
    }

    const statusCount = tasks.filter(t => t.status === targetStatus).length

    // 10 XP per task created — meaningful but completion (100+ XP × streak × multiplier)
    // remains the primary progression driver. Follows the "entry fee" pattern in game
    // design: rewarding intent without diminishing the completion reward.
    const CREATION_XP = 10

    const task = {
      id: uuidv4(),
      text: text.trim(),
      status: targetStatus,
      createdAt: new Date().toISOString(),
      completedAt: null,
      movedToLaterAt: null,
      order: statusCount,
      tag: null,
      creation_xp_awarded: CREATION_XP,
    }

    set(state => ({ tasks: [...state.tasks, task] }))
    await window.focusAPI.tasks.add(task)
    if (get().settings.soundEnabled) playTaskAdded()

    // Award small creation XP — silent (no slot/animation) unless it triggers a rank-up
    try {
      const result = await window.focusAPI.progression.awardCreationXP({ xpAmount: CREATION_XP })
      set(state => ({
        progression: {
          ...state.progression,
          currentXP: result.newXP,
          currentRankId: result.newRankId,
        }
      }))

      if (result.rankedUp) {
        const newRank = getRankById(result.newRankId)
        const oldRank = getRankById(result.previousRankId)
        const newSlots = newRank.taskSlots > oldRank.taskSlots ? newRank.taskSlots : null
        setTimeout(() => {
          set(state => ({
            ui: { ...state.ui, rankUpAnimation: {
              fromRankId: result.previousRankId,
              toRankId: result.newRankId,
              newSlots
            }}
          }))
        }, 600)
      }
    } catch (err) {
      console.warn('[addTask] creation XP award failed:', err)
    }

    // After first board clear of the day, all new Today tasks are free XP
    if (targetStatus === 'today' && get().progression.boardClearedToday) {
      set(state => ({
        progression: {
          ...state.progression,
          freeXPTaskIds: [...state.progression.freeXPTaskIds, task.id]
        }
      }))
      await window.focusAPI.progression.addFreeXPTask(task.id)
    }
  },

  completeTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task || task.status === 'done') return

    const isFreeXPTask = get().progression.freeXPTaskIds.includes(id)

    // ── Roll hidden multiplier (or reuse stored roll on re-completion) ──
    let multiplierRoll
    if (task.hidden_multiplier_tier) {
      // Re-use immutable stored roll from previous completion
      multiplierRoll = getMultiplierTier(task.hidden_multiplier_tier)
    } else {
      multiplierRoll = rollHiddenMultiplier(get().progression.dailyModifierType)
    }

    const { tasksCompletedToday, streakCount, boardClearedToday } = get().progression
    const streakMult = getStreakMultiplier(streakCount)
    const xpAmount = calculateTaskXPWithMultiplier(tasksCompletedToday, streakMult, multiplierRoll.value)

    set(state => ({
      ui: { ...state.ui, completingTaskId: id }
    }))

    // ── Show slot machine animation and block until it completes ──
    await new Promise(resolve => {
      set(state => ({
        ui: {
          ...state.ui,
          slotMachine: {
            tier: multiplierRoll.id,
            value: multiplierRoll.value,
            color: multiplierRoll.color,
            label: multiplierRoll.label,
            xpAmount,
            taskText: task.text,
            taskId: id,
          },
          pendingSlotMachineResolve: resolve,
        }
      }))
    })

    // ── Animation complete — now update task and award XP ──
    const completedAt = new Date().toISOString()
    const changes = {
      status: 'done',
      completedAt,
      hidden_multiplier_tier: multiplierRoll.id,
      hidden_multiplier_value: multiplierRoll.value,
      final_xp_awarded: xpAmount,
    }

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

      // Determine confetti mode — allDone beats normal; multiplier tier drives intensity
      const progress = get().todayProgress()
      const isAllDone = progress.allDone && progress.total > 0
      const mode = isAllDone ? 'allDone' : 'normal'

      // Sound is tier-differentiated — Pavlovian conditioning layer
      if (get().settings.soundEnabled) playCompletionSoundByTier(multiplierRoll.id, isAllDone)

      setTimeout(() => {
        set(state => ({ ui: { ...state.ui, confetti: { mode, id: Date.now(), isFreeXP: isFreeXPTask, multiplierTierId: multiplierRoll.id } } }))
      }, 600)

      // ── XP Award ──────────────────────────────────────────────
      const newTasksCompleted = tasksCompletedToday + 1

      const result = await window.focusAPI.progression.awardXP({
        xpAmount,
        tasksCompletedToday: newTasksCompleted
      })

      set(state => ({
        progression: {
          ...state.progression,
          currentXP: result.newXP,
          currentRankId: result.newRankId,
          tasksCompletedToday: newTasksCompleted
        }
      }))

      // Check for rank-up
      if (result.rankedUp) {
        const newRank = getRankById(result.newRankId)
        const oldRank = getRankById(result.previousRankId)
        const newSlots = newRank.taskSlots > oldRank.taskSlots ? newRank.taskSlots : null
        setTimeout(() => {
          set(state => ({
            ui: { ...state.ui, rankUpAnimation: {
              fromRankId: result.previousRankId,
              toRankId: result.newRankId,
              newSlots
            }}
          }))
        }, isAllDone ? 2000 : 1200)  // Delay more if allDone to let confetti play
      }

      // Check for first board clear of the day
      if (isAllDone && !boardClearedToday) {
        const boardResult = await window.focusAPI.progression.boardCleared()
        set(state => ({
          progression: {
            ...state.progression,
            boardClearedToday: boardResult.boardClearedToday,
            streakCount: boardResult.streakCount,
            streakLastDate: boardResult.streakLastDate,
          }
        }))

        // Build XP summary data with actual loot pull breakdown
        const resetBoundary = getResetTimestamp(get().settings.dailyResetHourUTC ?? 10)
        const todayDoneTasks = get().tasks.filter(
          t => t.status === 'done' && t.completedAt && t.completedAt > resetBoundary
        )
        const lootBreakdown = todayDoneTasks
          .filter(t => t.hidden_multiplier_tier)
          .map(t => ({
            taskText: t.text,
            tier: t.hidden_multiplier_tier,
            value: t.hidden_multiplier_value,
            xpAwarded: t.final_xp_awarded || 0,
            color: getMultiplierTier(t.hidden_multiplier_tier).color,
            label: getMultiplierTier(t.hidden_multiplier_tier).label,
          }))
        const actualTotalXP = todayDoneTasks.reduce((sum, t) => sum + (t.final_xp_awarded || 0), 0)

        setTimeout(() => {
          set(state => ({
            ui: { ...state.ui, xpSummary: {
              tasksCompleted: newTasksCompleted,
              totalXP: actualTotalXP || calculateDayXP(newTasksCompleted, streakMult).totalXP,
              lootBreakdown,
              streakDays: boardResult.streakCount,
              streakMultiplier: streakMult,
              currentXP: result.newXP,
              currentRankId: result.newRankId,
              rankedUp: result.rankedUp,
              newRankId: result.rankedUp ? result.newRankId : null,
            }}
          }))
        }, result.rankedUp ? 5000 : 2000)  // After rank-up animation if applicable

        // Auto-pull tasks from Later to fill available slots (all as free XP)
        setTimeout(() => {
          get().autoPullFromLater()
        }, result.rankedUp ? 5500 : 2500)
      }

      // In Free XP mode, auto-pull from Later when board is cleared again
      if (isAllDone && boardClearedToday) {
        setTimeout(() => {
          get().autoPullFromLater()
        }, 2500)
      }
    } catch (err) {
      console.error('[completeTask] IPC error, firing confetti with fallback lifetime:', err)

      const fallbackLifetime = (get().settings.lifetimeCompleted || 0) + 1
      set(state => ({
        settings: { ...state.settings, lifetimeCompleted: fallbackLifetime }
      }))

      const progress = get().todayProgress()
      const isAllDone = progress.allDone && progress.total > 0
      const mode = isAllDone ? 'allDone' : 'normal'

      if (get().settings.soundEnabled) playCompletionSoundByTier(multiplierRoll.id, isAllDone)

      setTimeout(() => {
        set(state => ({ ui: { ...state.ui, confetti: { mode, id: Date.now(), isFreeXP: isFreeXPTask, multiplierTierId: multiplierRoll.id } } }))
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
    const task = get().tasks.find(t => t.id === id)
    if (!task) return

    // Moving to Today: check slot limit
    if (targetStatus === 'today') {
      const todayCount = get().tasks.filter(t => t.status === 'today').length
      const maxSlots = get().taskSlots()
      if (todayCount >= maxSlots) {
        get().showToast('Today is full. Complete a task first.', 'warning')
        return
      }
    }

    // Moving from Today to Later: swap with first Later task (if Later has tasks, and not in developer mode)
    const developerMode = get().settings.developerMode ?? false
    if (!developerMode && task.status === 'today' && targetStatus === 'later') {
      const laterTasks = get().laterTasks()

      if (laterTasks.length > 0) {
        const swapTask = laterTasks[0]
        const laterCount = laterTasks.length
        const changes1 = { status: 'later', movedToLaterAt: new Date().toISOString(), order: laterCount }
        const changes2 = { status: 'today', movedToLaterAt: null, order: task.order }

        // Free XP propagation: if the outgoing task was free XP, the incoming task inherits it
        const { freeXPTaskIds, boardClearedToday } = get().progression
        const outgoingWasFree = freeXPTaskIds.includes(id)
        // After board is cleared, incoming swap tasks are always free XP
        const incomingShouldBeFree = outgoingWasFree || boardClearedToday

        let newFreeIds = freeXPTaskIds.filter(fid => fid !== id)
        if (incomingShouldBeFree && !newFreeIds.includes(swapTask.id)) {
          newFreeIds = [...newFreeIds, swapTask.id]
        }

        set(state => ({
          tasks: state.tasks.map(t => {
            if (t.id === id) return { ...t, ...changes1 }
            if (t.id === swapTask.id) return { ...t, ...changes2 }
            return t
          }),
          progression: {
            ...state.progression,
            freeXPTaskIds: newFreeIds
          }
        }))

        get().showToast(`Swapped to Later`, 'info')

        // Persist free XP changes
        if (outgoingWasFree) await window.focusAPI.progression.removeFreeXPTask(id)
        if (incomingShouldBeFree) await window.focusAPI.progression.addFreeXPTask(swapTask.id)

        await Promise.all([
          window.focusAPI.tasks.update(id, changes1),
          window.focusAPI.tasks.update(swapTask.id, changes2)
        ])
        return
      }
    }

    // Default move (no swap)
    const changes = {
      status: targetStatus,
      movedToLaterAt: targetStatus === 'later' ? new Date().toISOString() : null
    }
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...changes } : t)
    }))

    // Clean up freeXPTaskIds if moving a free XP task back to Later
    if (targetStatus === 'later') {
      const { freeXPTaskIds } = get().progression
      if (freeXPTaskIds.includes(id)) {
        set(state => ({
          progression: {
            ...state.progression,
            freeXPTaskIds: state.progression.freeXPTaskIds.filter(fid => fid !== id)
          }
        }))
        await window.focusAPI.progression.removeFreeXPTask(id)
      }
    }

    await window.focusAPI.tasks.update(id, changes)
  },

  deleteTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)

    // Clean up freeXPTaskIds if deleting a free XP task
    const { freeXPTaskIds } = get().progression
    if (freeXPTaskIds.includes(id)) {
      set(state => ({
        progression: {
          ...state.progression,
          freeXPTaskIds: state.progression.freeXPTaskIds.filter(fid => fid !== id)
        }
      }))
      window.focusAPI.progression.removeFreeXPTask(id)
    }

    set(state => ({
      tasks: state.tasks.filter(t => t.id !== id),
      ui: { ...state.ui, confirmDeleteId: null }
    }))
    await window.focusAPI.tasks.delete(id)

    // Deduct all XP this task contributed:
    //   creation_xp_awarded — always present (awarded when the task was created)
    //   final_xp_awarded    — only present if the task was completed
    const creationXP = task?.creation_xp_awarded ?? 0
    const completionXP = task?.status === 'done' ? (task?.final_xp_awarded ?? 0) : 0
    const totalDeduct = creationXP + completionXP

    if (totalDeduct > 0) {
      try {
        const result = await window.focusAPI.progression.deductXP({ xpAmount: totalDeduct })
        set(state => ({
          progression: {
            ...state.progression,
            currentXP: result.newXP,
            currentRankId: result.newRankId,
          }
        }))
        get().showToast(`-${totalDeduct} XP removed`, 'info')
      } catch (err) {
        console.error('[deleteTask] XP deduction failed:', err)
      }
    }
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
  setLastTaskMoment: (active) => set(state => ({ ui: { ...state.ui, lastTaskMoment: active } })),
  openSettings: () => set(state => ({ ui: { ...state.ui, isSettingsOpen: true } })),
  closeSettings: () => set(state => ({ ui: { ...state.ui, isSettingsOpen: false } })),
  confirmDelete: (id) => set(state => ({ ui: { ...state.ui, confirmDeleteId: id } })),
  cancelDelete: () => set(state => ({ ui: { ...state.ui, confirmDeleteId: null } })),

  showToast: (message, type = 'info') => {
    const toastId = Date.now()
    set(state => ({ ui: { ...state.ui, toast: { message, type, id: toastId } } }))
    setTimeout(() => {
      set(state => {
        if (state.ui.toast?.id === toastId) {
          return { ui: { ...state.ui, toast: null } }
        }
        return state
      })
    }, 3000)
  },
  dismissToast: () => set(state => ({ ui: { ...state.ui, toast: null } })),

  dismissXPSummary: () => set(state => ({ ui: { ...state.ui, xpSummary: null } })),

  dismissRankUpAnimation: () => set(state => ({ ui: { ...state.ui, rankUpAnimation: null } })),

  dismissSlotMachine: () => {
    const resolve = get().ui.pendingSlotMachineResolve
    if (resolve) resolve()
    set(state => ({
      ui: { ...state.ui, slotMachine: null, pendingSlotMachineResolve: null }
    }))
  },

  autoPullFromLater: async () => {
    const maxSlots = get().taskSlots()
    const todayCount = get().tasks.filter(t => t.status === 'today').length
    const available = maxSlots - todayCount
    if (available <= 0) return

    const laterTasks = get().laterTasks()
    const toPull = laterTasks.slice(0, available)
    if (toPull.length === 0) return

    for (const task of toPull) {
      const changes = { status: 'today', movedToLaterAt: null }
      set(state => ({
        tasks: state.tasks.map(t => t.id === task.id ? { ...t, ...changes } : t),
        progression: {
          ...state.progression,
          freeXPTaskIds: [...state.progression.freeXPTaskIds, task.id]
        }
      }))
      await window.focusAPI.tasks.update(task.id, changes)
      await window.focusAPI.progression.addFreeXPTask(task.id)
    }
  },

  resetTodayProgress: async () => {
    const resetAt = await window.focusAPI.progress.reset()
    set(state => ({ settings: { ...state.settings, progressResetAt: resetAt } }))
  },

  resetProgression: async () => {
    await window.focusAPI.progression.reset()
    set(state => ({
      progression: {
        currentXP: 0,
        currentRankId: 'bronze_4',
        streakCount: 0,
        streakLastDate: null,
        boardClearedToday: false,
        tasksCompletedToday: 0,
        freeXPTaskIds: [],
        pendingDerank: null,
        dailyBleedTotal: 0,
        bleedCapHitToday: false,
        bleedActive: true,
      }
    }))
  },

  updateSettings: async (changes) => {
    set(state => ({ settings: { ...state.settings, ...changes } }))
    await window.focusAPI.settings.update(changes)
  },

  hardReset: async () => {
    await window.focusAPI.hardReset()
    set({
      tasks: [],
      settings: {
        theme: 'dark',
        soundEnabled: true,
        fontSize: 'medium',
        dailyResetEnabled: false,
        lifetimeCompleted: 0,
        lastResetDate: null,
        progressResetAt: null,
      },
      progression: {
        currentXP: 0,
        currentRankId: 'bronze_4',
        streakCount: 0,
        streakLastDate: null,
        boardClearedToday: false,
        tasksCompletedToday: 0,
        freeXPTaskIds: [],
        pendingDerank: null,
        dailyBleedTotal: 0,
        bleedCapHitToday: false,
        bleedActive: true,
      },
      ui: { ...get().ui, isSettingsOpen: false },
    })
  },

  updateTaskTag: async (id, tag) => {
    const normalized = tag && tag.trim() ? tag.trim() : null
    const state = get()
    const task = state.tasks.find(t => t.id === id)
    if (!task) return

    if (normalized) {
      // Move the tagged task to the bottom of its list by reassigning order values
      const siblings = state.tasks
        .filter(t => t.status === task.status && t.id !== id)
        .sort((a, b) => a.order - b.order)
      const reorderedIds = [...siblings.map(t => t.id), id]
      set(s => ({
        tasks: s.tasks.map(t => {
          const idx = reorderedIds.indexOf(t.id)
          const updates = idx !== -1 ? { order: idx } : {}
          return t.id === id ? { ...t, tag: normalized, ...updates } : { ...t, ...updates }
        })
      }))
      await window.focusAPI.tasks.update(id, { tag: normalized })
      await window.focusAPI.tasks.reorder(reorderedIds)
    } else {
      set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, tag: normalized } : t)
      }))
      await window.focusAPI.tasks.update(id, { tag: normalized })
    }
  }
}))

export default useTaskStore
