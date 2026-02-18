import useTaskStore from '@/store/tasks'

export function useTasks() {
  const todayTasks = useTaskStore(s => s.todayTasks())
  const laterTasks = useTaskStore(s => s.laterTasks())
  const doneTasks = useTaskStore(s => s.doneTasks())
  const todayProgress = useTaskStore(s => s.todayProgress())
  const addTask = useTaskStore(s => s.addTask)
  const completeTask = useTaskStore(s => s.completeTask)
  const moveTask = useTaskStore(s => s.moveTask)
  const deleteTask = useTaskStore(s => s.deleteTask)
  const confirmDelete = useTaskStore(s => s.confirmDelete)
  const cancelDelete = useTaskStore(s => s.cancelDelete)

  return {
    todayTasks,
    laterTasks,
    doneTasks,
    todayProgress,
    addTask,
    completeTask,
    moveTask,
    deleteTask,
    confirmDelete,
    cancelDelete
  }
}

export function useSettings() {
  const settings = useTaskStore(s => s.settings)
  const updateSettings = useTaskStore(s => s.updateSettings)
  return { settings, updateSettings }
}

export function useUI() {
  const ui = useTaskStore(s => s.ui)
  const setTab = useTaskStore(s => s.setTab)
  const openSettings = useTaskStore(s => s.openSettings)
  const closeSettings = useTaskStore(s => s.closeSettings)
  return { ui, setTab, openSettings, closeSettings }
}
