import { BrowserWindow, Tray, screen, ipcMain, nativeImage } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const WIN_HEIGHT = 96
const EXPANDED_HEIGHT = 306
const WIN_WIDTH = 620

let quickEntryWindow = null
let tray = null
let mainWindowRef = null
let webContentsReady = false
let hiding = false   // debounce guard

/**
 * Store a reference to the main window so we can detect
 * when the user is already looking at the Focus app.
 */
export function setMainWindow(win) {
  mainWindowRef = win
}

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
 * Create a tray icon.
 * On macOS: 16x16 template image (auto-inverts for dark/light menu bar).
 * On Windows: 16x16 white "+" on transparent background (shows in system tray).
 */
function createTrayIcon() {
  const size = 16
  const isMac = process.platform === 'darwin'

  // Create RGBA buffer — draw a "+" icon
  const buf = Buffer.alloc(size * size * 4, 0) // all transparent

  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const i = (y * size + x) * 4
    buf[i] = r
    buf[i + 1] = g
    buf[i + 2] = b
    buf[i + 3] = a
  }

  // On macOS use black pixels (template image inverts automatically).
  // On Windows use white pixels so the icon is visible on the dark taskbar.
  const [r, g, b] = isMac ? [0, 0, 0] : [255, 255, 255]

  // Vertical bar of "+" : x=7,8 from y=3 to y=12
  for (let y = 3; y <= 12; y++) {
    setPixel(7, y, r, g, b)
    setPixel(8, y, r, g, b)
  }
  // Horizontal bar of "+" : y=7,8 from x=3 to x=12
  for (let x = 3; x <= 12; x++) {
    setPixel(x, 7, r, g, b)
    setPixel(x, 8, r, g, b)
  }

  const img = nativeImage.createFromBuffer(buf, { width: size, height: size })
  if (isMac) img.setTemplateImage(true)
  return img
}

const BOTTOM_MARGIN = 32

/**
 * Get the position for the quick-entry window at the bottom-center of the active display.
 */
function getWindowBounds(height) {
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

  // ── Tray icon ─────────────────────────────────────────────
  if (!tray) {
    tray = new Tray(createTrayIcon())
    tray.setToolTip('Focus — Quick Add')
    tray.on('click', () => {
      toggleQuickEntry()
    })
  }

  // ── Quick-entry window ────────────────────────────────────
  const isMac = process.platform === 'darwin'
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
    ...(isMac ? { type: 'panel' } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload-quick-entry.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Float above everything, visible on all Spaces/desktops
  if (isMac) {
    quickEntryWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    quickEntryWindow.setAlwaysOnTop(true, 'floating')
  } else {
    quickEntryWindow.setAlwaysOnTop(true, 'screen-saver')
  }

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
    const bounds = getWindowBounds(expanded ? EXPANDED_HEIGHT : WIN_HEIGHT)
    quickEntryWindow.setBounds(bounds)
  })

  return quickEntryWindow
}

export function showQuickEntry() {
  if (!quickEntryWindow || quickEntryWindow.isDestroyed()) return

  // If the main Focus window is already focused, don't show the quick-entry
  // bar — just tell the main window to focus its task input instead.
  if (mainWindowRef && !mainWindowRef.isDestroyed() && mainWindowRef.isFocused()) {
    mainWindowRef.webContents.send('focus-task-input')
    return
  }

  if (quickEntryWindow.isVisible()) return

  hiding = false
  const bounds = getWindowBounds(WIN_HEIGHT)
  quickEntryWindow.setBounds(bounds)

  // Re-assert always-on-top before showing
  if (process.platform === 'darwin') {
    quickEntryWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    quickEntryWindow.setAlwaysOnTop(true, 'floating')
  } else {
    quickEntryWindow.setAlwaysOnTop(true, 'screen-saver')
  }

  quickEntryWindow.showInactive()
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

/**
 * Destroy the tray icon and quick-entry window.
 * Called on app quit so nothing keeps the process alive.
 */
export function destroyQuickEntry() {
  if (tray) {
    tray.destroy()
    tray = null
  }
  if (quickEntryWindow && !quickEntryWindow.isDestroyed()) {
    quickEntryWindow.destroy()
    quickEntryWindow = null
  }
}
