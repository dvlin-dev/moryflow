/**
 * [INPUT]: PersistedChatSession 映射与会话序列
 * [OUTPUT]: 本地聊天会话的读写操作
 * [POS]: Moryflow 桌面端聊天会话持久化
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import Store from 'electron-store';
import {
  DEFAULT_STORE,
  STORE_NAME,
  type ChatSessionStoreShape,
  type PersistedChatSession,
} from './const.js';

const store = new Store<ChatSessionStoreShape>({
  name: STORE_NAME,
  defaults: DEFAULT_STORE,
});

const isValidMode = (value: unknown): value is PersistedChatSession['mode'] =>
  value === 'agent' || value === 'full_access';

const normalizeSessions = (sessions: Record<string, PersistedChatSession>) => {
  let changed = false;
  const normalized: Record<string, PersistedChatSession> = {};

  for (const [id, session] of Object.entries(sessions)) {
    const nextMode = isValidMode(session.mode) ? session.mode : 'agent';
    if (nextMode !== session.mode) {
      changed = true;
      normalized[id] = { ...session, mode: nextMode };
    } else {
      normalized[id] = session;
    }
  }

  if (changed) {
    store.set('sessions', normalized);
  }

  return normalized;
};

export const readSessions = () => {
  const sessions = store.get('sessions') ?? DEFAULT_STORE.sessions;
  return normalizeSessions(sessions);
};

export const writeSessions = (sessions: Record<string, PersistedChatSession>) => {
  store.set('sessions', sessions);
};

export const takeSequence = () => {
  const current = store.get('sequence') ?? DEFAULT_STORE.sequence;
  store.set('sequence', current + 1);
  return current;
};

export const resetStore = () => {
  store.set('sessions', DEFAULT_STORE.sessions);
  store.set('sequence', DEFAULT_STORE.sequence);
};
