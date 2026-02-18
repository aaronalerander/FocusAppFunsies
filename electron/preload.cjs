const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('focusAPI', {
  tasks: {
    readAll: () => ipcRenderer.invoke('tasks:read'),
    writeAll: (tasks) => ipcRenderer.invoke('tasks:write', tasks),
    add: (task) => ipcRenderer.invoke('task:add', task),
    update: (id, changes) => ipcRenderer.invoke('task:update', { id, changes }),
    delete: (id) => ipcRenderer.invoke('task:delete', id),
    reorder: (orderedIds) => ipcRenderer.invoke('task:reorder', orderedIds)
  },
  settings: {
    read: () => ipcRenderer.invoke('settings:read'),
    write: (settings) => ipcRenderer.invoke('settings:write', settings),
    update: (changes) => ipcRenderer.invoke('settings:update', changes)
  },
  lifetime: {
    increment: () => ipcRenderer.invoke('lifetime:increment')
  },
  progress: {
    reset: () => ipcRenderer.invoke('progress:reset')
  },
  system: {
    getTheme: () => ipcRenderer.invoke('system:theme')
  },
  tags: {
    getAll: () => ipcRenderer.invoke('tags:all')
  },
  progression: {
    read: () => ipcRenderer.invoke('progression:read'),
    awardXP: (data) => ipcRenderer.invoke('progression:awardXP', data),
    boardCleared: () => ipcRenderer.invoke('progression:boardCleared'),
    addFreeXPTask: (taskId) => ipcRenderer.invoke('progression:addFreeXPTask', taskId),
    removeFreeXPTask: (taskId) => ipcRenderer.invoke('progression:removeFreeXPTask', taskId),
    reset: () => ipcRenderer.invoke('progression:reset'),
    clearDerank: () => ipcRenderer.invoke('progression:clearDerank'),
    deductXP: (data) => ipcRenderer.invoke('progression:deductXP', data),
  },
  hardReset: () => ipcRenderer.invoke('hardReset'),
  onDailyReset: (callback) => {
    ipcRenderer.on('daily-reset', callback)
    return () => ipcRenderer.removeListener('daily-reset', callback)
  },
  onBleedTick: (callback) => {
    const wrapped = (_event, data) => callback(data)
    ipcRenderer.on('bleed-tick', wrapped)
    return () => ipcRenderer.removeListener('bleed-tick', wrapped)
  },
  onTaskAddedExternally: (callback) => {
    const wrapped = (_event, task) => callback(task)
    ipcRenderer.on('task-added-externally', wrapped)
    return () => ipcRenderer.removeListener('task-added-externally', wrapped)
  },
})
