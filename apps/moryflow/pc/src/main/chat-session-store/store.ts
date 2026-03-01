/**
 * [INPUT]: PersistedChatSession 映射与会话序列
 * [OUTPUT]: 本地聊天会话的读写操作
 * [POS]: Moryflow 桌面端聊天会话持久化
 * [UPDATE]: 2026-03-01 - 移除 legacy unscoped 会话兼容，非法 vaultPath 会话直接清理
 * [UPDATE]: 2026-02-11 - 移除未使用的 sequence 持久化字段与读取逻辑，收敛存储职责
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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

const isValidMode = (value: unknown): value is PersistedChatSession['mode'] =>
  value === 'agent' || value === 'full_access';

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

const normalizeSessions = (sessions: Record<string, PersistedChatSession>) => {
  let changed = false;
  const normalized: Record<string, PersistedChatSession> = {};

  for (const [id, session] of Object.entries(sessions)) {
    const nextVaultPath = normalizeVaultPath(session.vaultPath);
    if (!nextVaultPath) {
      changed = true;
      continue;
    }

    const nextMode = isValidMode(session.mode) ? session.mode : 'agent';
    const isVaultPathChanged = nextVaultPath !== session.vaultPath;
    const isModeChanged = nextMode !== session.mode;
    if (isVaultPathChanged || isModeChanged) {
      changed = true;
      normalized[id] = { ...session, mode: nextMode, vaultPath: nextVaultPath };
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
