/**
 * [PROVIDES]: resolveMobileSyncStatusModel - Mobile 云同步状态文案/动作派生
 * [DEPENDS]: ./const
 * [POS]: Mobile 设置页与 workspace sheet 的统一交互模型
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { SyncEngineStatus, SyncNotice } from './const';

export type MobileSyncStatusTone = 'syncing' | 'needs-attention' | 'synced';
export type MobileSyncCalloutKind = 'setup' | 'recovery' | 'offline' | 'conflict' | null;
export type MobileSyncPrimaryAction =
  | 'sync-now'
  | 'open-settings'
  | 'resume-recovery'
  | 'retry'
  | 'open-conflict-copy';

type ResolveMobileSyncStatusModelInput = {
  isEnabled: boolean;
  isSyncing: boolean;
  status: SyncEngineStatus;
  hasError: boolean;
  notice: SyncNotice | null;
};

export type MobileSyncStatusModel = {
  tone: MobileSyncStatusTone;
  calloutKind: MobileSyncCalloutKind;
  primaryAction: MobileSyncPrimaryAction;
};

export const resolveMobileSyncStatusModel = ({
  isEnabled,
  isSyncing,
  status,
  hasError,
  notice,
}: ResolveMobileSyncStatusModelInput): MobileSyncStatusModel => {
  if (isSyncing) {
    return {
      tone: 'syncing',
      calloutKind: null,
      primaryAction: 'sync-now',
    };
  }

  if (status === 'needs_recovery') {
    return {
      tone: 'needs-attention',
      calloutKind: 'recovery',
      primaryAction: 'resume-recovery',
    };
  }

  if (!isEnabled || status === 'disabled') {
    return {
      tone: 'needs-attention',
      calloutKind: 'setup',
      primaryAction: 'open-settings',
    };
  }

  if (status === 'offline' || hasError) {
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
