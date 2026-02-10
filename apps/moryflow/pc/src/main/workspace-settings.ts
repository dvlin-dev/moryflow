/**
 * [INPUT]: vaultPath, filePath, PersistedTab
 * [OUTPUT]: 工作区持久化配置（展开路径/最近文件/打开标签）
 * [POS]: 主进程工作区设置存储（electron-store）
 * [UPDATE]: 2026-02-10 - 用 lastAgentSub 替代 lastMode：Agent 入口内二级（Chat/Workspace）全局记忆（不持久化 destination）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import Store from 'electron-store';
import { buildRecentFilesList } from './workspace-settings.utils.js';

/** 打开的标签页信息（持久化用） */
export type PersistedTab = {
  id: string;
  name: string;
  path: string;
  pinned?: boolean;
};

type WorkspaceState = {
  expandedPaths: Record<string, string[]>;
  /** 最后打开的文件路径（按 Vault） */
  lastOpenedFile: Record<string, string | null>;
  /** 打开的标签页列表（按 Vault） */
  openTabs: Record<string, PersistedTab[]>;
  /** 最近操作的文件（按 Vault） */
  recentFiles: Record<string, string[]>;
  /** Agent 入口二级入口（全局记忆）：Chat / Workspace */
  lastAgentSub: 'chat' | 'workspace';
};

const workspaceStore = new Store<WorkspaceState>({
  name: 'workspace',
  defaults: {
    expandedPaths: {},
    lastOpenedFile: {},
    openTabs: {},
    recentFiles: {},
    lastAgentSub: 'chat',
  },
});

const isValidAgentSub = (value: unknown): value is WorkspaceState['lastAgentSub'] =>
  value === 'chat' || value === 'workspace';

export const getLastAgentSub = (): WorkspaceState['lastAgentSub'] => {
  const stored = workspaceStore.get('lastAgentSub');
  return isValidAgentSub(stored) ? stored : 'chat';
};

export const setLastAgentSub = (sub: WorkspaceState['lastAgentSub']): void => {
  workspaceStore.set('lastAgentSub', sub);
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

// ============ 最后打开的文件 ============

export const getLastOpenedFile = (vaultPath: string): string | null => {
  const bucket = workspaceStore.get('lastOpenedFile');
  if (!bucket || typeof bucket !== 'object') {
    return null;
  }
  return bucket[vaultPath] ?? null;
};

export const setLastOpenedFile = (vaultPath: string, filePath: string | null) => {
  const bucket = workspaceStore.get('lastOpenedFile');
  const next = { ...(bucket ?? {}), [vaultPath]: filePath };
  workspaceStore.set('lastOpenedFile', next);
};

// ============ 打开的标签页 ============

export const getOpenTabs = (vaultPath: string): PersistedTab[] => {
  const bucket = workspaceStore.get('openTabs');
  if (!bucket || typeof bucket !== 'object') {
    return [];
  }
  return bucket[vaultPath] ?? [];
};

export const setOpenTabs = (vaultPath: string, tabs: PersistedTab[]) => {
  const bucket = workspaceStore.get('openTabs');
  const next = { ...(bucket ?? {}), [vaultPath]: tabs };
  workspaceStore.set('openTabs', next);
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
