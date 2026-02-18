import { BrowserWindow, screen, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const WIN_HEIGHT = 72
const EXPANDED_HEIGHT = 280
const WIN_WIDTH = 580
const BOTTOM_MARGIN = 32

let quickEntryWindow = null
let webContentsReady = false
let hiding = false   // debounce guard

function safeSend(channel, ...args) {
  if (!quickEntryWindow || quickEntryWindow.isDestroyed()) return
  if (!webContentsReady) return
  try {
    if (quickEntryWindow.webContents.isDestroyed()) return
    quickEntryWindow.webContents.send(channel, ...args)
  } catch (_) {
    // ignore — EPIPE caught by process-level handler
  }
}

/**
 * Get the on-screen position for the quick-entry bar on the active display.
 */
function getOnScreenBounds(height) {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const { x: dx, y: dy, width: dw, height: dh } = display.workArea
  return {
    x: dx + Math.round((dw - WIN_WIDTH) / 2),
    y: dy + dh - height - BOTTOM_MARGIN,
    width: WIN_WIDTH,
    height,
  }
}

export function createQuickEntryWindow() {
  if (quickEntryWindow && !quickEntryWindow.isDestroyed()) return quickEntryWindow

  quickEntryWindow = new BrowserWindow({
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    focusable: true,
    type: 'panel',
    webPreferences: {
      preload: join(__dirname, 'preload-quick-entry.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // 'floating' is the native macOS NSPanel level — panels can accept key input
  // without activating the owning application or triggering Space switches.
  quickEntryWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  quickEntryWindow.setAlwaysOnTop(true, 'floating')

  webContentsReady = false
  quickEntryWindow.webContents.on('did-finish-load', () => {
    webContentsReady = true
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    quickEntryWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '/quick-entry.html')
  } else {
    quickEntryWindow.loadFile(join(__dirname, '../dist/quick-entry.html'))
  }

  quickEntryWindow.on('blur', () => {
    hideQuickEntry()
  })

  // Handle resize requests from the renderer (tag picker open/close)
  ipcMain.on('quick-entry:resize', (_e, expanded) => {
    if (!quickEntryWindow || quickEntryWindow.isDestroyed()) return
    if (!quickEntryWindow.isVisible()) return
    const bounds = getOnScreenBounds(expanded ? EXPANDED_HEIGHT : WIN_HEIGHT)
    quickEntryWindow.setBounds(bounds)
  })

  return quickEntryWindow
}

export function showQuickEntry() {
  if (!quickEntryWindow || quickEntryWindow.isDestroyed()) return
  if (quickEntryWindow.isVisible()) return

  hiding = false
  const bounds = getOnScreenBounds(WIN_HEIGHT)
  quickEntryWindow.setBounds(bounds)
  quickEntryWindow.show()
  quickEntryWindow.focus()
  safeSend('quick-entry:focus')
}

export function hideQuickEntry() {
  if (!quickEntryWindow || quickEntryWindow.isDestroyed()) return
  if (!quickEntryWindow.isVisible()) return
  if (hiding) return
  hiding = true

  safeSend('quick-entry:reset')
  quickEntryWindow.hide()
}

export function toggleQuickEntry() {
  if (quickEntryWindow && quickEntryWindow.isVisible() && !hiding) {
    hideQuickEntry()
  } else {
    showQuickEntry()
  }
}
