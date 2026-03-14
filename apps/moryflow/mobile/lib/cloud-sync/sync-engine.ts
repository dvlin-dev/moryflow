/**
 * [INPUT]: vaultPath, 文件变更事件
 * [OUTPUT]: 同步状态、同步结果（提交成功后回写 FileIndex）
 * [POS]: Cloud Sync 同步引擎入口，协调各模块，管理同步状态
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import { getAccessToken, refreshAccessToken } from '@/lib/server/auth-session';
import { fileIndexManager } from '@/lib/vault/file-index';
import { createLogger } from '@/lib/agent-runtime';
import { cloudSyncApi, CloudSyncApiError } from './api-client';
import { readSettings, readBinding, writeSettings } from './store';
import { detectLocalChanges } from './file-collector';
import { executeActions } from './executor';
import { tryAutoBinding, resetAutoBindingState, setRetryCallback } from './auto-binding';
import {
  createApplyJournal,
  updateApplyJournal,
  type ApplyJournalRecord,
} from './apply-journal';
import { recoverPendingApply } from './recovery-coordinator';
import {
  SYNC_DEBOUNCE_DELAY,
  createDefaultSettings,
  type SyncNotice,
  type SyncEngineStatus,
  type SyncStatusSnapshot,
  type CloudSyncSettings,
} from './const';

// ── 类型定义 ────────────────────────────────────────────────

interface SyncEngineState {
  // 状态
  status: SyncEngineStatus;
  offlineReason: 'user' | 'error' | null;
  vaultPath: string | null;
  vaultId: string | null;
  vaultName: string | null;
  lastSyncAt: number | null;
  error: string | null;
  pendingCount: number;
  notice: SyncNotice | null;

  // Settings
  settings: CloudSyncSettings | null;
}

interface SyncEngineActions {
  // 状态更新
  setStatus: (status: SyncEngineStatus, reason?: 'user' | 'error') => void;
  setVault: (vaultPath: string | null, vaultId: string | null, vaultName: string | null) => void;
  setLastSync: (time: number | null) => void;
  setError: (error: string | null) => void;
  setPendingCount: (count: number) => void;
  setNotice: (notice: SyncNotice | null) => void;
  setSettings: (settings: CloudSyncSettings) => void;

  // 获取快照
  getSnapshot: () => SyncStatusSnapshot;
}

type SyncEngineStore = SyncEngineState & SyncEngineActions;

const shouldSyncValue = <T>(prev: T, next: T): boolean => !Object.is(prev, next);

const isSettingsEqual = (prev: CloudSyncSettings | null, next: CloudSyncSettings): boolean =>
  Boolean(
    prev &&
    prev.syncEnabled === next.syncEnabled &&
    prev.deviceId === next.deviceId &&
    prev.deviceName === next.deviceName
  );

const buildStatusSnapshot = (state: SyncEngineState): SyncStatusSnapshot => ({
  status: state.status,
  vaultId: state.vaultId,
  vaultName: state.vaultName,
  lastSyncAt: state.lastSyncAt,
  error: state.error,
  pendingCount: state.pendingCount,
  notice: state.notice,
});

const isStatusSnapshotEqual = (prev: SyncStatusSnapshot, next: SyncStatusSnapshot): boolean =>
  prev.status === next.status &&
  prev.vaultId === next.vaultId &&
  prev.vaultName === next.vaultName &&
  prev.lastSyncAt === next.lastSyncAt &&
  prev.error === next.error &&
  prev.pendingCount === next.pendingCount &&
  isSyncNoticeEqual(prev.notice, next.notice);

const isSyncNoticeEqual = (prev: SyncNotice | null, next: SyncNotice | null): boolean => {
  if (prev === next) {
    return true;
  }
  if (!prev || !next) {
    return false;
  }
  if (
    prev.kind !== next.kind ||
    prev.createdAt !== next.createdAt ||
    prev.items.length !== next.items.length
  ) {
    return false;
  }

  return prev.items.every((item, index) => {
    const nextItem = next.items[index];
    return nextItem && item.fileId === nextItem.fileId && item.path === nextItem.path;
  });
};

let cachedSnapshot: SyncStatusSnapshot = {
  status: 'disabled',
  vaultId: null,
  vaultName: null,
  lastSyncAt: null,
  error: null,
  pendingCount: 0,
  notice: null,
};

const getStableSnapshot = (state: SyncEngineState): SyncStatusSnapshot => {
  const nextSnapshot = buildStatusSnapshot(state);
  if (isStatusSnapshotEqual(cachedSnapshot, nextSnapshot)) {
    return cachedSnapshot;
  }
  cachedSnapshot = nextSnapshot;
  return cachedSnapshot;
};

// ── Zustand Store ────────────────────────────────────────────

export const useSyncEngineStore = create<SyncEngineStore>()((set, get) => ({
  // 初始状态
  status: 'disabled',
  offlineReason: null,
  vaultPath: null,
  vaultId: null,
  vaultName: null,
  lastSyncAt: null,
  error: null,
  pendingCount: 0,
  notice: null,
  settings: null,

  // Actions
  setStatus: (status, reason) =>
    set((state) => {
      const nextOfflineReason =
        status === 'offline' ? (reason ?? state.offlineReason ?? 'error') : null;
      if (
        !shouldSyncValue(state.status, status) &&
        !shouldSyncValue(state.offlineReason, nextOfflineReason)
      ) {
        return state;
      }
      return {
        status,
        offlineReason: nextOfflineReason,
      };
    }),
  setVault: (vaultPath, vaultId, vaultName) =>
    set((state) =>
      shouldSyncValue(state.vaultPath, vaultPath) ||
      shouldSyncValue(state.vaultId, vaultId) ||
      shouldSyncValue(state.vaultName, vaultName)
        ? { vaultPath, vaultId, vaultName }
        : state
    ),
  setLastSync: (time) =>
    set((state) => (shouldSyncValue(state.lastSyncAt, time) ? { lastSyncAt: time } : state)),
  setError: (error) => set((state) => (shouldSyncValue(state.error, error) ? { error } : state)),
  setPendingCount: (count) =>
    set((state) => (shouldSyncValue(state.pendingCount, count) ? { pendingCount: count } : state)),
  setNotice: (notice) =>
    set((state) => (isSyncNoticeEqual(state.notice, notice) ? state : { notice })),
  setSettings: (settings) =>
    set((state) => (isSettingsEqual(state.settings, settings) ? state : { settings })),

  getSnapshot: () => getStableSnapshot(get()),
}));

// ── 同步锁 ────────────────────────────────────────────────────

const SYNC_LOCK_TIMEOUT = 5 * 60 * 1000;
let syncLock = false;
let syncLockTime = 0;

const createConflictCopyNotice = (
  conflictEntries: Array<{ conflictCopyId: string; conflictCopyPath: string }>
): SyncNotice | null => {
  if (conflictEntries.length === 0) {
    return null;
  }

  return {
    kind: 'conflict_copy_created',
    createdAt: Date.now(),
    items: conflictEntries.map((entry) => ({
      fileId: entry.conflictCopyId,
      path: entry.conflictCopyPath,
    })),
  };
};

// ── 防抖调度 ────────────────────────────────────────────────

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const logger = createLogger('[CloudSync]');

const scheduleSync = (): void => {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    void performSync();
  }, SYNC_DEBOUNCE_DELAY);
};

const cancelScheduledSync = (): void => {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
};

const isNetworkError = (error: unknown): boolean => {
  if (error instanceof CloudSyncApiError) {
    return error.status === 0 || error.status === 408 || error.isServerError;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('connection')
    );
  }
  return false;
};

// ── 核心同步流程 ────────────────────────────────────────────

const performSync = async (): Promise<void> => {
  const store = useSyncEngineStore.getState();

  // 超时保护
  if (syncLock && Date.now() - syncLockTime > SYNC_LOCK_TIMEOUT) {
    console.warn('[CloudSync] Sync lock timeout, force release');
    syncLock = false;
  }

  if (syncLock) return;
  if (store.status === 'syncing') return;

  syncLock = true;
  syncLockTime = Date.now();

  try {
    await performSyncInternal();
  } finally {
    syncLock = false;
  }
};

const performSyncInternal = async (): Promise<void> => {
  const store = useSyncEngineStore.getState();
  const { vaultPath, vaultId, status, settings, offlineReason } = store;

  if (!vaultPath || !vaultId) return;
  if (status === 'disabled') return;
  if (!settings?.syncEnabled) return;

  try {
    store.setStatus('syncing');
    store.setError(null);
    const binding = await readBinding(vaultPath);

    if (
      await recoverPendingApply({
        vaultPath,
        vaultId,
        currentUserId: binding?.userId,
      })
    ) {
      store.setError(null);
    }

    // 收集本地变更
    const { dtos, pendingChanges, localStates } = await detectLocalChanges(
      vaultPath,
      settings.deviceId
    );
    store.setPendingCount(pendingChanges.size);

    // 获取同步差异
    const { actions } = await cloudSyncApi.syncDiff({
      vaultId,
      deviceId: settings.deviceId,
      localFiles: dtos,
    });

    if (actions.length === 0 && pendingChanges.size === 0) {
      store.setNotice(null);
      store.setLastSync(Date.now());
      store.setPendingCount(0);
      store.setStatus('idle');
      return;
    }

    const journalId = randomUUID();
    await createApplyJournal(vaultPath, {
      journalId,
      createdAt: Date.now(),
      phase: 'executing',
      vaultId,
      userId: binding?.userId,
      uploadedObjects: [],
      stagedOperations: [],
      executeResult: {
        receipts: [],
        completedFileIds: [],
        deleted: [],
        downloadedEntries: [],
        conflictEntries: [],
        stagedOperations: [],
        uploadedObjects: [],
        errors: [],
      },
      pendingChanges: Array.from(pendingChanges.values()),
      localStates: Array.from(localStates.values()),
    } satisfies ApplyJournalRecord);

    // 执行同步操作
    const executeResult = await executeActions(
      actions,
      vaultPath,
      journalId,
      settings.deviceId,
      pendingChanges,
      localStates
    );

    await updateApplyJournal(vaultPath, (current) => ({
      ...current,
      phase: 'prepared',
      uploadedObjects: executeResult.uploadedObjects,
      stagedOperations: executeResult.stagedOperations,
      executeResult,
      pendingChanges: Array.from(pendingChanges.values()),
      localStates: Array.from(localStates.values()),
    }));

    if (executeResult.errors.length > 0) {
      console.warn(`[CloudSync] ${executeResult.errors.length} action(s) failed`);
      store.setStatus('needs_recovery');
      store.setError('Sync requires recovery');
      return;
    }

    // 提交同步结果
    if (executeResult.receipts.length > 0) {
      const commitResult = await cloudSyncApi.syncCommit({
        vaultId,
        deviceId: settings.deviceId,
        receipts: executeResult.receipts,
      });

      if (!commitResult.success) {
        if (commitResult.conflicts) {
          console.warn('[CloudSync] Commit has conflicts:', commitResult.conflicts);
          store.setError('Sync requires recovery');
        } else {
          console.warn('[CloudSync] Commit failed without conflicts');
          store.setError('Sync commit failed');
        }
        store.setStatus('needs_recovery');
        return;
      }

      await updateApplyJournal(vaultPath, (current) => ({
        ...current,
        phase: 'committed',
      }));
      await recoverPendingApply({
        vaultPath,
        vaultId,
        currentUserId: binding?.userId,
      });
    }

    store.setNotice(createConflictCopyNotice(executeResult.conflictEntries));
    store.setLastSync(Date.now());
    store.setPendingCount(0);
    store.setStatus('idle');
  } catch (error) {
    if (error instanceof CloudSyncApiError) {
      store.setError(error.message);
      if (error.isUnauthorized) {
        store.setStatus('disabled');
      } else if (error.isServerError) {
        store.setStatus('offline', 'error');
      } else {
        store.setStatus('needs_recovery');
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      store.setError(errorMessage);
      store.setStatus(isNetworkError(error) ? 'offline' : 'needs_recovery', 'error');
    }
  }
};

// ── 导出 API ────────────────────────────────────────────────

export const cloudSyncEngine = {
  /**
   * 初始化同步引擎（在 vault 打开时调用）
   */
  async init(vaultPath: string): Promise<void> {
    const store = useSyncEngineStore.getState();

    // 加载或创建设置
    let settings = await readSettings();
    if (!settings.deviceId) {
      settings = createDefaultSettings();
      await writeSettings(settings);
    }
    store.setSettings(settings);

    if (!settings.syncEnabled) {
      store.setStatus('disabled');
      store.setVault(vaultPath, null, null);
      return;
    }

    const refreshed = await refreshAccessToken();
    const token = getAccessToken();
    if (!refreshed || !token) {
      store.setStatus('disabled');
      store.setVault(vaultPath, null, null);
      return;
    }

    // 自动绑定
    let binding = await readBinding(vaultPath);
    if (!binding) {
      logger.info('No binding found, trying auto binding...');
      binding = await tryAutoBinding(vaultPath);
      if (!binding) {
        logger.warn('Auto binding failed, entering degraded mode');
        store.setStatus('offline', 'error');
        store.setVault(vaultPath, null, null);
        store.setError('Auto binding failed, will retry later');
        return;
      }
    }

    // 加载 fileIndex 并扫描
    await fileIndexManager.load(vaultPath);
    const created = await fileIndexManager.scanAndCreateIds(vaultPath);
    if (created > 0) {
      logger.info(`fileIndex created ${created} new entries`);
    }

    store.setVault(vaultPath, binding.vaultId, binding.vaultName);
    store.setStatus('idle');

    // 注册重试回调
    setRetryCallback(() => {
      void cloudSyncEngine.reinit();
    });

    // 立即触发首次同步
    void performSync();
  },

  /**
   * 停止同步引擎
   */
  stop(): void {
    const store = useSyncEngineStore.getState();

    cancelScheduledSync();

    const prevPath = store.vaultPath;
    if (prevPath) {
      fileIndexManager.clearCache(prevPath);
    }

    syncLock = false;
    resetAutoBindingState();

    store.setStatus('disabled');
    store.setVault(null, null, null);
    store.setLastSync(null);
    store.setError(null);
    store.setPendingCount(0);
    store.setNotice(null);
  },

  /**
   * 处理文件变化
   */
  handleFileChange(): void {
    const store = useSyncEngineStore.getState();
    const { vaultPath, status } = store;

    if (!vaultPath || status === 'disabled') return;

    store.setPendingCount(store.pendingCount + 1);
    scheduleSync();
  },

  /**
   * 手动触发同步
   */
  triggerSync(): void {
    void performSync();
  },

  /**
   * 获取状态快照
   */
  getStatus(): SyncStatusSnapshot {
    return useSyncEngineStore.getState().getSnapshot();
  },

  /**
   * 更新设置
   */
  async updateSettings(updates: Partial<CloudSyncSettings>): Promise<void> {
    const store = useSyncEngineStore.getState();
    const current = store.settings ?? (await readSettings());
    const newSettings = { ...current, ...updates };
    await writeSettings(newSettings);
    store.setSettings(newSettings);

    // 如果启用/禁用同步，需要重新初始化
    if ('syncEnabled' in updates) {
      if (updates.syncEnabled && store.vaultPath) {
        await this.init(store.vaultPath);
      } else if (!updates.syncEnabled) {
        this.stop();
      }
    }
  },

  /**
   * 重新初始化
   */
  async reinit(): Promise<void> {
    const store = useSyncEngineStore.getState();
    const { vaultPath } = store;
    if (vaultPath) {
      await this.init(vaultPath);
    }
  },
} as const;
