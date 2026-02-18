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
  }
})
