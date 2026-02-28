import { BrowserWindow } from 'electron';
import type { ChatSessionEvent } from '../../shared/ipc.js';
import { searchIndexService } from '../search-index/index.js';

export const broadcastToRenderers = (channel: string, payload: unknown) => {
  for (const window of BrowserWindow.getAllWindows()) {
    try {
      window.webContents.send(channel, payload);
    } catch (error) {
      console.warn('[chat] broadcast failed', error);
    }
  }
};

export const broadcastSessionEvent = (event: ChatSessionEvent) => {
  if (event.type === 'deleted') {
    void searchIndexService.onSessionDelete(event.sessionId).catch((error) => {
      console.warn('[search-index] session delete failed', event.sessionId, error);
    });
  } else {
    void searchIndexService.onSessionUpsert(event.session.id).catch((error) => {
      console.warn('[search-index] session upsert failed', event.session.id, error);
    });
  }
  broadcastToRenderers('chat:session-event', event);
};
