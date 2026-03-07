/**
 * [PROVIDES]: resolveSyncStatusModel - PC 云同步状态文案/动作派生
 * [DEPENDS]: @shared/ipc
 * [POS]: 顶部状态指示器与 HoverCard 的统一交互模型
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { SyncEngineStatus, SyncNotice } from '@shared/ipc';

export type SyncStatusTone = 'syncing' | 'needs-attention' | 'synced';
export type SyncStatusCalloutKind = 'setup' | 'recovery' | 'offline' | 'conflict' | null;
export type SyncPrimaryAction =
  | 'sync-now'
  | 'open-settings'
  | 'resume-recovery'
  | 'retry'
  | 'open-conflict-copy';

type ResolveSyncStatusModelInput = {
  hasBinding: boolean;
  isSyncing: boolean;
  engineStatus: SyncEngineStatus;
  hasError: boolean;
  notice: SyncNotice | null | undefined;
};

export type SyncStatusModel = {
  tone: SyncStatusTone;
  calloutKind: SyncStatusCalloutKind;
  primaryAction: SyncPrimaryAction;
};

export const resolveSyncStatusModel = ({
  hasBinding,
  isSyncing,
  engineStatus,
  hasError,
  notice,
}: ResolveSyncStatusModelInput): SyncStatusModel => {
  if (isSyncing) {
    return {
      tone: 'syncing',
      calloutKind: null,
      primaryAction: 'sync-now',
    };
  }

  if (engineStatus === 'needs_recovery') {
    return {
      tone: 'needs-attention',
      calloutKind: 'recovery',
      primaryAction: 'resume-recovery',
    };
  }

  if (!hasBinding || engineStatus === 'disabled') {
    return {
      tone: 'needs-attention',
      calloutKind: 'setup',
      primaryAction: 'open-settings',
    };
  }

  if (engineStatus === 'offline' || hasError) {
    return {
      tone: 'needs-attention',
      calloutKind: 'offline',
      primaryAction: 'retry',
    };
  }

  if (notice?.kind === 'conflict_copy_created' && notice.items.length > 0) {
    return {
      tone: 'synced',
      calloutKind: 'conflict',
      primaryAction: 'open-conflict-copy',
    };
  }

  return {
    tone: 'synced',
    calloutKind: null,
    primaryAction: 'sync-now',
  };
};
