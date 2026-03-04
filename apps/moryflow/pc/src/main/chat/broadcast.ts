import { BrowserWindow } from 'electron';
import type { ChatMessageEvent, ChatSessionEvent } from '../../shared/ipc.js';
import { searchIndexService } from '../search-index/index.js';

const messageRevisionBySession = new Map<string, number>();

const getRevision = (sessionId: string): number => {
  return messageRevisionBySession.get(sessionId) ?? 0;
};

const bumpRevision = (sessionId: string): number => {
  const next = getRevision(sessionId) + 1;
  messageRevisionBySession.set(sessionId, next);
  return next;
};

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

export const getCurrentMessageRevision = (sessionId: string): number => {
  return getRevision(sessionId);
};

export const broadcastMessageEvent = (
  event:
    | Omit<Extract<ChatMessageEvent, { type: 'snapshot' }>, 'revision'>
    | Omit<Extract<ChatMessageEvent, { type: 'deleted' }>, 'revision'>
): ChatMessageEvent => {
  const revision = bumpRevision(event.sessionId);
  const nextEvent = {
    ...event,
    revision,
  } as ChatMessageEvent;
  broadcastToRenderers('chat:message-event', nextEvent);
  if (event.type === 'deleted') {
    messageRevisionBySession.delete(event.sessionId);
  }
  return nextEvent;
};
