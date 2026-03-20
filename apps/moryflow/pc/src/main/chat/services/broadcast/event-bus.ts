import { BrowserWindow } from 'electron';
import type { ChatMessageEvent, ChatSessionEvent } from '../../../../shared/ipc.js';
import type { UIMessage } from 'ai';

export type MessageSnapshotState = {
  revision: number;
  messages: UIMessage[];
  persisted: boolean;
};

const messageSnapshotBySession = new Map<string, MessageSnapshotState>();
const messageEventSubscribers = new Set<(event: ChatMessageEvent) => void>();
const sessionEventSubscribers = new Set<(event: ChatSessionEvent) => void>();

const getRevision = (sessionId: string): number => {
  return messageSnapshotBySession.get(sessionId)?.revision ?? 0;
};

const bumpRevision = (sessionId: string): number => {
  return getRevision(sessionId) + 1;
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
  for (const subscriber of sessionEventSubscribers) {
    try {
      subscriber(event);
    } catch (error) {
      console.warn('[chat] session event subscriber failed', error);
    }
  }
  broadcastToRenderers('chat:session-event', event);
};

export const subscribeSessionEvents = (subscriber: (event: ChatSessionEvent) => void) => {
  sessionEventSubscribers.add(subscriber);
  return () => {
    sessionEventSubscribers.delete(subscriber);
  };
};

export const getCurrentMessageRevision = (sessionId: string): number => {
  return getRevision(sessionId);
};

export const getLatestMessageSnapshot = (sessionId: string): MessageSnapshotState | null => {
  return messageSnapshotBySession.get(sessionId) ?? null;
};

export const broadcastMessageEvent = (
  event:
    | Omit<Extract<ChatMessageEvent, { type: 'snapshot' }>, 'revision'>
    | Omit<Extract<ChatMessageEvent, { type: 'deleted' }>, 'revision'>
): ChatMessageEvent => {
  const revision = bumpRevision(event.sessionId);
  if (event.type === 'snapshot') {
    messageSnapshotBySession.set(event.sessionId, {
      revision,
      messages: event.messages,
      persisted: event.persisted,
    });
  }
  const nextEvent = {
    ...event,
    revision,
  } as ChatMessageEvent;
  for (const subscriber of messageEventSubscribers) {
    try {
      subscriber(nextEvent);
    } catch (error) {
      console.warn('[chat] message event subscriber failed', error);
    }
  }
  broadcastToRenderers('chat:message-event', nextEvent);
  if (event.type === 'deleted') {
    messageSnapshotBySession.delete(event.sessionId);
  }
  return nextEvent;
};

export const subscribeMessageEvents = (subscriber: (event: ChatMessageEvent) => void) => {
  messageEventSubscribers.add(subscriber);
  return () => {
    messageEventSubscribers.delete(subscriber);
  };
};
