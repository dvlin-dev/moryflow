/**
 * [INPUT]: PersistedChatSession 映射与会话序列
 * [OUTPUT]: 本地聊天会话的读写操作
 * [POS]: Moryflow 桌面端聊天会话持久化
 * [UPDATE]: 2026-02-11 - 移除未使用的 sequence 持久化字段与读取逻辑，收敛存储职责
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import Store from 'electron-store';
import {
  DEFAULT_STORE,
  LEGACY_UNSCOPED_VAULT_PATH,
  STORE_NAME,
  type ChatSessionStoreShape,
  type PersistedChatSession,
} from './const.js';
import { getVaults } from '../vault/store.js';

const store = new Store<ChatSessionStoreShape>({
  name: STORE_NAME,
  defaults: DEFAULT_STORE,
});

const isValidMode = (value: unknown): value is PersistedChatSession['mode'] =>
  value === 'agent' || value === 'full_access';

const resolveLegacyVaultPath = () => {
  const vaults = getVaults();
  if (vaults.length === 1) {
    return vaults[0]?.path ?? null;
  }
  return null;
};

const normalizeVaultPath = (value: unknown, legacyVaultPath: string | null) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return legacyVaultPath ?? LEGACY_UNSCOPED_VAULT_PATH;
};

const normalizeSessions = (sessions: Record<string, PersistedChatSession>) => {
  let changed = false;
  const normalized: Record<string, PersistedChatSession> = {};
  const legacyVaultPath = resolveLegacyVaultPath();

  for (const [id, session] of Object.entries(sessions)) {
    const nextMode = isValidMode(session.mode) ? session.mode : 'agent';
    const nextVaultPath = normalizeVaultPath(session.vaultPath, legacyVaultPath);
    if (nextMode !== session.mode || nextVaultPath !== session.vaultPath) {
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
