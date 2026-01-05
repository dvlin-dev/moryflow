import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'

export type MainWindowHooks = {
  onFocus?: (window: BrowserWindow) => void
  onClosed?: (window: BrowserWindow) => void
}

export type CreateMainWindowOptions = {
  preloadPath: string
  hooks?: MainWindowHooks
}

/**
 * 创建应用主窗口，统一处理基础配置与生命周期事件。
 */
export const createMainWindow = async ({ preloadPath, hooks }: CreateMainWindowOptions) => {
  console.log('[electron] preload entry', preloadPath)
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false,
    },
  })

  const pageUrl = process.env['ELECTRON_RENDERER_URL']
  if (app.isPackaged) {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  } else if (pageUrl) {
    await mainWindow.loadURL(pageUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('focus', () => {
    hooks?.onFocus?.(mainWindow)
  })

  mainWindow.on('closed', () => {
    hooks?.onClosed?.(mainWindow)
  })

  hooks?.onFocus?.(mainWindow)

  return mainWindow
}
