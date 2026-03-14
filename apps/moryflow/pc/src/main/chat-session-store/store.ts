/**
 * [INPUT]: PersistedChatSession 映射与会话序列
 * [OUTPUT]: 本地聊天会话的读写操作
 * [POS]: Moryflow 桌面端聊天会话持久化
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import path from 'node:path';
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

const normalizeVaultPath = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || !path.isAbsolute(trimmed)) {
    return null;
  }
  return trimmed;
};

const normalizeProfileKey = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSessions = (sessions: Record<string, PersistedChatSession>) => {
  let changed = false;
  const normalized: Record<string, PersistedChatSession> = {};

  for (const [id, session] of Object.entries(sessions)) {
    const nextVaultPath = normalizeVaultPath(session.vaultPath);
    if (!nextVaultPath) {
      changed = true;
      continue;
    }
    const nextProfileKey = normalizeProfileKey(session.profileKey);

    const isVaultPathChanged = nextVaultPath !== session.vaultPath;
    const hasLegacyMode = Object.prototype.hasOwnProperty.call(session, 'mode');
    if (
      isVaultPathChanged ||
      hasLegacyMode ||
      nextProfileKey !== (session.profileKey ?? null)
    ) {
      changed = true;
      const { mode: _legacyMode, ...rest } = session as PersistedChatSession & {
        mode?: unknown;
      };
      normalized[id] = {
        ...rest,
        vaultPath: nextVaultPath,
        profileKey: nextProfileKey,
      };
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

export const resetStore = () => {
  store.set('sessions', DEFAULT_STORE.sessions);
};
