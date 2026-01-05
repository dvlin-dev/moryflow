import { BrowserWindow } from 'electron'
import type { ChatSessionEvent } from '../../shared/ipc.js'

export const broadcastToRenderers = (channel: string, payload: unknown) => {
  for (const window of BrowserWindow.getAllWindows()) {
    try {
      window.webContents.send(channel, payload)
    } catch (error) {
      console.warn('[chat] broadcast failed', error)
    }
  }
}

export const broadcastSessionEvent = (event: ChatSessionEvent) => {
  broadcastToRenderers('chat:session-event', event)
}
