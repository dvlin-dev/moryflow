/**
 * [PROVIDES]: 云同步设置区块状态派生 helper
 * [DEPENDS]: @shared/ipc
 * [POS]: CloudSyncSection 的纯函数状态模型，避免组件中分散条件判断
 * [UPDATE]: 2026-02-26 - 新增 section/status 派生逻辑，供容器与单测复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { SyncEngineStatus } from '@shared/ipc';

export type CloudSyncSectionState = 'auth-loading' | 'unauthenticated' | 'missing-vault' | 'ready';

export type CloudSyncStatusTone = 'syncing' | 'needs-attention' | 'synced';

type ResolveCloudSyncSectionStateInput = {
  authLoading: boolean;
  isAuthenticated: boolean;
  vaultPath?: string | null;
};

type ResolveCloudSyncStatusToneInput = {
  isSyncing: boolean;
  hasBinding: boolean;
  engineStatus: SyncEngineStatus;
  hasError: boolean;
};

export const resolveCloudSyncSectionState = ({
  authLoading,
  isAuthenticated,
  vaultPath,
}: ResolveCloudSyncSectionStateInput): CloudSyncSectionState => {
  if (authLoading) {
    return 'auth-loading';
  }
  if (!isAuthenticated) {
    return 'unauthenticated';
  }
  if (!vaultPath) {
    return 'missing-vault';
  }
  return 'ready';
};

export const resolveCloudSyncStatusTone = ({
  isSyncing,
  hasBinding,
  engineStatus,
  hasError,
}: ResolveCloudSyncStatusToneInput): CloudSyncStatusTone => {
  if (isSyncing) {
    return 'syncing';
  }
  if (!hasBinding || engineStatus === 'offline' || engineStatus === 'disabled' || hasError) {
    return 'needs-attention';
  }
  return 'synced';
};
