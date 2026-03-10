/**
 * [INPUT]: vaultPath, filePath, PersistedTab
 * [OUTPUT]: 工作区持久化配置（展开路径/最近文件/打开标签）
 * [POS]: 主进程工作区设置存储（electron-store）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import Store from 'electron-store';
import { buildRecentFilesList } from './workspace-settings.utils.js';
import type { PersistedDocumentSession, PersistedTab } from '../shared/ipc.js';

type WorkspaceState = {
  expandedPaths: Record<string, string[]>;
  /** 旧版文档持久化：最后打开的文件路径（仅迁移） */
  lastOpenedFile: Record<string, string | null>;
  /** 旧版文档持久化：打开的标签页列表（仅迁移） */
  openTabs: Record<string, PersistedTab[]>;
  /** 当前文档会话（按 Vault） */
  documentSessions: Record<string, PersistedDocumentSession>;
  /** 最近操作的文件（按 Vault） */
  recentFiles: Record<string, string[]>;
  /** Agent 入口二级入口（全局记忆）：Chat / Home */
  lastSidebarMode: 'chat' | 'home';
};

const workspaceStore = new Store<WorkspaceState>({
  name: 'workspace',
  defaults: {
    expandedPaths: {},
    lastOpenedFile: {},
    openTabs: {},
    documentSessions: {},
    recentFiles: {},
    lastSidebarMode: 'chat',
  },
});

const isValidSidebarMode = (value: unknown): value is WorkspaceState['lastSidebarMode'] =>
  value === 'chat' || value === 'home';

export const getLastSidebarMode = (): WorkspaceState['lastSidebarMode'] => {
  const stored = workspaceStore.get('lastSidebarMode');
  return isValidSidebarMode(stored) ? stored : 'chat';
};

export const setLastSidebarMode = (mode: WorkspaceState['lastSidebarMode']): void => {
  workspaceStore.set('lastSidebarMode', mode);
};

export const getExpandedPaths = (vaultPath: string): string[] => {
  const bucket = workspaceStore.get('expandedPaths');
  if (!bucket || typeof bucket !== 'object') {
    return [];
  }
  return bucket[vaultPath] ?? [];
};

export const setExpandedPaths = (vaultPath: string, paths: string[]) => {
  const bucket = workspaceStore.get('expandedPaths');
  const next = { ...(bucket ?? {}), [vaultPath]: paths };
  workspaceStore.set('expandedPaths', next);
};

// ============ 文档会话 ============

const getLegacyLastOpenedFile = (vaultPath: string): string | null => {
  const bucket = workspaceStore.get('lastOpenedFile');
  if (!bucket || typeof bucket !== 'object') {
    return null;
  }
  return bucket[vaultPath] ?? null;
};

const getLegacyOpenTabs = (vaultPath: string): PersistedTab[] => {
  const bucket = workspaceStore.get('openTabs');
  if (!bucket || typeof bucket !== 'object') {
    return [];
  }
  return bucket[vaultPath] ?? [];
};

const readDocumentSessionsBucket = () => {
  const bucket = workspaceStore.get('documentSessions');
  if (!bucket || typeof bucket !== 'object') {
    return {};
  }
  return bucket;
};

export const getDocumentSession = (vaultPath: string): PersistedDocumentSession => {
  const bucket = readDocumentSessionsBucket();
  const current = bucket[vaultPath];
  if (current) {
    return {
      tabs: Array.isArray(current.tabs) ? current.tabs : [],
      activePath: typeof current.activePath === 'string' ? current.activePath : null,
    };
  }

  const migrated: PersistedDocumentSession = {
    tabs: getLegacyOpenTabs(vaultPath),
    activePath: getLegacyLastOpenedFile(vaultPath),
  };
  if (migrated.tabs.length > 0 || migrated.activePath !== null) {
    setDocumentSession(vaultPath, migrated);
  }
  return migrated;
};

export const setDocumentSession = (vaultPath: string, session: PersistedDocumentSession) => {
  const bucket = readDocumentSessionsBucket();
  const next = { ...(bucket ?? {}), [vaultPath]: session };
  workspaceStore.set('documentSessions', next);
};

// ============ 最近操作的文件 ============

export const getRecentFiles = (vaultPath: string): string[] => {
  const bucket = workspaceStore.get('recentFiles');
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) {
    return [];
  }
  return bucket[vaultPath] ?? [];
};

export const recordRecentFile = (vaultPath: string, filePath: string | null) => {
  if (!filePath) {
    return;
  }
  const bucket = workspaceStore.get('recentFiles');
  const safeBucket = bucket && typeof bucket === 'object' && !Array.isArray(bucket) ? bucket : {};
  const current = safeBucket[vaultPath] ?? [];
  const nextList = buildRecentFilesList(current, filePath);
  const next = { ...safeBucket, [vaultPath]: nextList };
  workspaceStore.set('recentFiles', next);
};

export const removeRecentFile = (vaultPath: string, filePath: string | null) => {
  if (!filePath) {
    return;
  }
  const bucket = workspaceStore.get('recentFiles');
  const safeBucket = bucket && typeof bucket === 'object' && !Array.isArray(bucket) ? bucket : {};
  const current = safeBucket[vaultPath] ?? [];
  const nextList = current.filter((path) => path !== filePath);
  const next = { ...safeBucket, [vaultPath]: nextList };
  workspaceStore.set('recentFiles', next);
};
