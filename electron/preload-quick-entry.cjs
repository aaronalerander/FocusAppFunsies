const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('quickEntryAPI', {
  addTask: (text, tag) => ipcRenderer.invoke('quick-entry:addTask', { text, tag }),
  hide: () => ipcRenderer.send('quick-entry:hide'),
  resize: (expanded) => ipcRenderer.send('quick-entry:resize', expanded),
  tags: {
    getAll: () => ipcRenderer.invoke('tags:all'),
  },
  onFocus: (callback) => {
    const wrapped = () => callback()
    ipcRenderer.on('quick-entry:focus', wrapped)
    return () => ipcRenderer.removeListener('quick-entry:focus', wrapped)
  },
  onReset: (callback) => {
    const wrapped = () => callback()
    ipcRenderer.on('quick-entry:reset', wrapped)
    return () => ipcRenderer.removeListener('quick-entry:reset', wrapped)
  },
})
