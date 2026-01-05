import type { BrowserWindow } from 'electron'

export type ActiveWindowGetter = () => BrowserWindow | null
export type VaultFsEventType =
  | 'file-added'
  | 'file-changed'
  | 'file-removed'
  | 'dir-added'
  | 'dir-removed'

/**
 * 创建文件系统事件推送方法，聚焦当前活跃窗口。
 */
export const createFsEventEmitter = (getActiveWindow: ActiveWindowGetter) => {
  return (type: VaultFsEventType, changedPath: string) => {
    const activeWindow = getActiveWindow()
    if (!activeWindow || activeWindow.isDestroyed()) {
      return
    }
    activeWindow.webContents.send('vault:fs-event', { type, path: changedPath })
  }
}
