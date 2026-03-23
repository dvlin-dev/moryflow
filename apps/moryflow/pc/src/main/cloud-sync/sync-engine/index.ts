/**
 * [INPUT]: vaultPath, settings, 文件变更事件
 * [OUTPUT]: 同步状态更新 + 调度结果
 * [POS]: PC 云同步引擎入口，协调 diff/execute/commit 全流程
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { randomUUID } from 'node:crypto';
import { cloudSyncApi, CloudSyncApiError } from '../api/client.js';
import { membershipBridge } from '../../membership/bridge.js';
import { syncState } from './state.js';
import {
  detectLocalChanges,
  executeActionsWithTracking,
  getRelativePath,
  resetHashCache,
} from './executor.js';
import { scheduleSync, cancelScheduledSync } from './scheduler.js';
import { activityTracker } from './activity-tracker.js';
import { createLogger } from '../logger.js';
import { isNetworkError } from '../errors.js';
import { tryAutoBinding, resetAutoBindingState, setRetryCallback } from '../auto-binding.js';
import type { SyncStatusSnapshot, SyncStatusDetail } from '../const.js';
import { SYNC_DELETION_DEBOUNCE_DELAY } from '../const.js';
import { normalizeCloudSyncPath } from '../path-normalizer.js';
import { ensureFileId, moveFileId } from '../file-id-registry.js';
import { getActiveVaultInfo } from '../../vault/index.js';
import {
  createApplyJournal,
  updateApplyJournal,
  type ApplyJournalRecord,
} from '../apply-journal.js';
import { recoverPendingApply } from '../recovery-coordinator.js';
import type { SyncNotice } from '../const.js';
import type { ConflictEntry } from './executor.js';
import { readDeviceConfig } from '../../device-config/store.js';
import { getStoredWorkspaceProfile } from '../../workspace-profile/resolve.js';
import { workspaceDocRegistry } from '../../workspace-doc-registry/index.js';
import {
  clearSyncMirrorCache,
  getAllSyncMirrorEntries,
  loadSyncMirror,
} from '../sync-mirror-state.js';

const log = createLogger('sync-engine');

// ── 初始化依赖注入 ────────────────────────────────────────────

// 将 activityTracker 注入 syncState，避免循环依赖
syncState.setActivityTracker(activityTracker);

// 注册自动绑定重试回调（避免循环依赖）
setRetryCallback(() => {
  void cloudSyncEngine.reinit();
});

// ── 同步锁 ────────────────────────────────────────────────────

/** 同步锁超时时间（5 分钟） */
const SYNC_LOCK_TIMEOUT = 5 * 60 * 1000;

/** 防止并发同步的锁 */
let syncLock = false;

/** 锁获取时间（用于超时保护） */
let syncLockTime = 0;

const pendingPreparationTasks = new Set<Promise<unknown>>();

const trackPreparationTask = (task: Promise<unknown>): void => {
  const tracked = task.finally(() => {
    pendingPreparationTasks.delete(tracked);
  });
  pendingPreparationTasks.add(tracked);
};

const waitForPendingPreparationTasks = async (): Promise<void> => {
  if (pendingPreparationTasks.size === 0) {
    return;
  }

  await Promise.allSettled([...pendingPreparationTasks]);
};

const createConflictCopyNotice = (conflictEntries: ConflictEntry[]): SyncNotice | undefined => {
  if (conflictEntries.length === 0) {
    return undefined;
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

interface SyncSession {
  epoch: number;
  vaultPath: string;
  vaultId: string;
  profileKey: string;
  userId: string;
  workspaceId: string;
}

let syncSessionEpoch = 0;

// Track scope loaded during init so stop() can clear caches even if
// init exited early before committing to syncState.
let loadedCacheScope: { vaultPath: string; profileKey: string; workspaceId: string } | null = null;

const bumpSyncSessionEpoch = (): number => {
  syncSessionEpoch += 1;
  return syncSessionEpoch;
};

const handleSyncSessionDrift = (session: SyncSession): void => {
  log.warn('sync session drift detected, aborting current batch', {
    vaultPath: session.vaultPath,
    profileKey: session.profileKey,
    userId: session.userId,
  });
  syncState.clearPending();
  activityTracker.clearPending();
  syncState.setStatus('idle');
};

const isSyncSessionCurrent = async (session: SyncSession): Promise<boolean> => {
  if (session.epoch !== syncSessionEpoch) {
    return false;
  }
  if (
    syncState.vaultPath !== session.vaultPath ||
    syncState.vaultId !== session.vaultId ||
    syncState.profileKey !== session.profileKey ||
    syncState.userId !== session.userId ||
    syncState.workspaceId !== session.workspaceId
  ) {
    return false;
  }

  const currentProfile = await getStoredWorkspaceProfile(session.vaultPath);
  return Boolean(
    currentProfile &&
    currentProfile.userId === session.userId &&
    currentProfile.profileKey === session.profileKey &&
    currentProfile.profile.syncEnabled &&
    currentProfile.profile.syncVaultId === session.vaultId
  );
};

// ── 核心同步流程 ────────────────────────────────────────────

const performSync = async (): Promise<void> => {
  // 超时保护：如果锁超过 5 分钟未释放，强制释放
  if (syncLock && Date.now() - syncLockTime > SYNC_LOCK_TIMEOUT) {
    log.warn('sync lock timeout, force release');
    syncLock = false;
  }

  // 使用锁防止并发
  if (syncLock) return;
  syncLock = true;
  syncLockTime = Date.now();

  try {
    await performSyncInternal();
  } finally {
    syncLock = false;
  }
};

/** 实际的同步逻辑 */
const performSyncInternal = async (): Promise<void> => {
  const { vaultPath, vaultId, profileKey, workspaceId, status } = syncState;
  if (!vaultPath || !vaultId || !profileKey || !workspaceId) return;
  if (status === 'syncing') return;
  if (status === 'disabled') return;
  if (status === 'offline' && syncState.getStatusReason() === 'user') return;

  const activeProfile = await getStoredWorkspaceProfile(vaultPath);
  if (!activeProfile) {
    // Profile lookup failed transiently (e.g., network blip in
    // fetchCurrentUserId). Keep existing state and go offline so the
    // next scheduled sync can retry without requiring a full reinit.
    syncState.setStatus('offline', 'error');
    syncState.broadcast();
    return;
  }
  if (!activeProfile.profile.syncEnabled || !activeProfile.profile.syncVaultId) {
    syncState.setStatus('disabled');
    syncState.setVault(vaultPath, null);
    syncState.setProfileKey(null);
    syncState.setWorkspaceId(null);
    syncState.broadcast();
    return;
  }
  const deviceConfig = readDeviceConfig();
  const syncSession: SyncSession = {
    epoch: syncSessionEpoch,
    vaultPath,
    vaultId,
    profileKey,
    userId: activeProfile.userId,
    workspaceId,
  };

  let syncActivityStarted = false;

  try {
    await waitForPendingPreparationTasks();
    if (!(await isSyncSessionCurrent(syncSession))) {
      handleSyncSessionDrift(syncSession);
      return;
    }

    syncState.setStatus('syncing');
    syncState.setError(undefined);
    syncState.broadcast();

    if (
      await recoverPendingApply({
        vaultPath,
        profileKey,
        workspaceId,
        vaultId,
        currentUserId: activeProfile.userId,
      })
    ) {
      syncState.broadcast();
    }
    if (!(await isSyncSessionCurrent(syncSession))) {
      handleSyncSessionDrift(syncSession);
      return;
    }

    // 1. 检测本地变更（只读，不修改 FileIndex）
    const { dtos, pendingChanges, localStates } = await detectLocalChanges(
      vaultPath,
      profileKey,
      workspaceId,
      deviceConfig.deviceId
    );

    // 2. 获取同步差异
    const { actions } = await cloudSyncApi.syncDiff({
      vaultId,
      deviceId: deviceConfig.deviceId,
      localFiles: dtos,
    });

    if (actions.length === 0 && pendingChanges.size === 0) {
      // 没有需要同步的内容
      syncState.setNotice(undefined);
      syncState.setLastSync(Date.now());
      syncState.clearPending();
      activityTracker.clearPending();
      syncState.setStatus('idle');
      syncState.broadcast();
      return;
    }

    // 3. 初始化活动追踪器
    activityTracker.startSync(actions.length);
    syncActivityStarted = true;
    const journalId = randomUUID();
    await createApplyJournal(vaultPath, profileKey, {
      journalId,
      createdAt: Date.now(),
      phase: 'executing',
      vaultId,
      userId: activeProfile.userId,
      workspaceId: activeProfile.profile.workspaceId,
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

    // 4. 执行同步操作（只做 I/O，不修改 FileIndex）
    const executeResult = await executeActionsWithTracking(
      actions,
      vaultPath,
      profileKey,
      workspaceId,
      journalId,
      deviceConfig.deviceId,
      pendingChanges,
      localStates,
      () => syncState.broadcast()
    );
    if (!(await isSyncSessionCurrent(syncSession))) {
      handleSyncSessionDrift(syncSession);
      return;
    }

    await updateApplyJournal(vaultPath, profileKey, (current) => ({
      ...current,
      phase: 'prepared',
      uploadedObjects: executeResult.uploadedObjects,
      stagedOperations: executeResult.stagedOperations,
      executeResult,
      pendingChanges: Array.from(pendingChanges.values()),
      localStates: Array.from(localStates.values()),
    }));
    if (!(await isSyncSessionCurrent(syncSession))) {
      handleSyncSessionDrift(syncSession);
      return;
    }

    // 记录错误
    if (executeResult.errors.length > 0) {
      log.warn(`${executeResult.errors.length} action(s) failed`);
      syncState.setStatus('needs_recovery');
      syncState.setError('Sync requires recovery');
      return;
    }

    // 5. 提交同步结果
    if (executeResult.receipts.length > 0) {
      const commitResult = await cloudSyncApi.syncCommit({
        vaultId,
        deviceId: deviceConfig.deviceId,
        receipts: executeResult.receipts,
      });
      if (!(await isSyncSessionCurrent(syncSession))) {
        handleSyncSessionDrift(syncSession);
        return;
      }

      if (!commitResult.success) {
        if (commitResult.conflicts) {
          log.warn('commit has conflicts:', commitResult.conflicts);
          syncState.setError('Sync requires recovery');
        } else {
          log.warn('commit failed without conflicts');
          syncState.setError('Sync commit failed');
        }
        syncState.setStatus('needs_recovery');
        return;
      }

      // 6. commit 成功后更新 FileIndex
      await updateApplyJournal(vaultPath, profileKey, (current) => ({
        ...current,
        phase: 'committed',
      }));
      if (!(await isSyncSessionCurrent(syncSession))) {
        handleSyncSessionDrift(syncSession);
        return;
      }
      await recoverPendingApply({
        vaultPath,
        profileKey,
        workspaceId,
        vaultId,
        currentUserId: activeProfile.userId,
      });
    }

    syncState.setNotice(createConflictCopyNotice(executeResult.conflictEntries));
    syncState.setLastSync(Date.now());
    syncState.clearPending();
    activityTracker.clearPending();
    syncState.setStatus('idle');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof CloudSyncApiError) {
      syncState.setError(error.message);
      if (error.isUnauthorized) {
        // token 失效，禁用同步
        syncState.setStatus('disabled');
      } else if (error.isServerError) {
        // 服务器错误，标记为离线
        syncState.setStatus('offline', 'error');
      } else {
        syncState.setStatus('needs_recovery');
      }
    } else {
      syncState.setError(errorMessage);
      syncState.setStatus(isNetworkError(error) ? 'offline' : 'needs_recovery', 'error');
    }
  } finally {
    if (syncActivityStarted) {
      activityTracker.endSync();
    }
    syncState.broadcast();
  }
};

// ── 导出 API ────────────────────────────────────────────────

export const cloudSyncEngine = {
  /**
   * 初始化同步引擎（在 vault 打开时调用）
   * 登录后会自动绑定 Vault 并开始同步
   */
  async init(vaultPath: string): Promise<void> {
    const initEpoch = bumpSyncSessionEpoch();
    const isStale = () => initEpoch !== syncSessionEpoch;

    const config = membershipBridge.getConfig();

    if (!config.token) {
      syncState.setStatus('disabled');
      syncState.setVault(vaultPath, null);
      syncState.setProfileKey(null);
      syncState.setWorkspaceId(null);
      syncState.setUserId(null);
      syncState.broadcast();
      return;
    }

    let resolvedProfile = await getStoredWorkspaceProfile(vaultPath);
    if (isStale()) return;

    if (!resolvedProfile) {
      // Profile lookup failed transiently (e.g., /me network blip).
      // Go offline so scheduled sync can retry without full reinit.
      syncState.setStatus('offline', 'error');
      syncState.setVault(vaultPath, null);
      syncState.setProfileKey(null);
      syncState.setWorkspaceId(null);
      syncState.setUserId(null);
      syncState.setError('Profile lookup failed, will retry');
      syncState.broadcast();
      return;
    }

    if (!resolvedProfile.profile.syncEnabled) {
      syncState.setStatus('disabled');
      syncState.setVault(vaultPath, null);
      syncState.setProfileKey(null);
      syncState.setWorkspaceId(null);
      syncState.setUserId(null);
      syncState.broadcast();
      return;
    }

    if (!resolvedProfile.profile.syncVaultId) {
      log.info('sync enabled without syncVaultId, trying auto binding...');
      const binding = await tryAutoBinding(vaultPath);
      if (isStale()) return;

      if (!binding) {
        log.warn('auto binding failed, entering degraded mode');
        syncState.setStatus('offline', 'error');
        syncState.setVault(vaultPath, null);
        syncState.setProfileKey(null);
        syncState.setWorkspaceId(null);
        syncState.setUserId(null);
        syncState.setError('Auto binding failed, will retry later');
        syncState.broadcast();
        return;
      }
      resolvedProfile = await getStoredWorkspaceProfile(vaultPath);
      if (isStale()) return;

      if (!resolvedProfile?.profile.syncVaultId) {
        syncState.setStatus('offline', 'error');
        syncState.setVault(vaultPath, null);
        syncState.setProfileKey(null);
        syncState.setWorkspaceId(null);
        syncState.setUserId(null);
        syncState.setError('Sync profile is unavailable');
        syncState.broadcast();
        return;
      }
    }

    const scopeForCache = {
      vaultPath,
      profileKey: resolvedProfile.profileKey,
      workspaceId: resolvedProfile.profile.workspaceId,
    };
    loadedCacheScope = scopeForCache;

    await loadSyncMirror(
      scopeForCache.vaultPath,
      scopeForCache.profileKey,
      scopeForCache.workspaceId
    );
    if (isStale()) return;

    await workspaceDocRegistry.load(
      scopeForCache.vaultPath,
      scopeForCache.profileKey,
      scopeForCache.workspaceId
    );
    if (isStale()) return;

    const retainMissingDocumentIds = new Set(
      getAllSyncMirrorEntries(
        vaultPath,
        resolvedProfile.profileKey,
        resolvedProfile.profile.workspaceId
      )
        .filter((entry) => entry.lastSyncedHash !== null)
        .map((entry) => entry.documentId)
    );
    await workspaceDocRegistry.sync(
      vaultPath,
      resolvedProfile.profileKey,
      resolvedProfile.profile.workspaceId,
      { retainMissingDocumentIds }
    );
    if (isStale()) return;

    syncState.setVault(vaultPath, resolvedProfile.profile.syncVaultId);
    syncState.setProfileKey(resolvedProfile.profileKey);
    syncState.setWorkspaceId(resolvedProfile.profile.workspaceId);
    syncState.setUserId(resolvedProfile.userId);
    syncState.setStatus('idle');
    syncState.broadcast();

    // 立即触发首次同步（双向合并）
    void performSync();
  },

  /**
   * 停止同步引擎
   */
  stop(): void {
    bumpSyncSessionEpoch();
    cancelScheduledSync();
    resetHashCache();
    pendingPreparationTasks.clear();

    // Clear caches from committed syncState scope
    const prevPath = syncState.vaultPath;
    const prevProfileKey = syncState.profileKey;
    const prevWorkspaceId = syncState.workspaceId;
    if (prevPath && prevProfileKey && prevWorkspaceId) {
      clearSyncMirrorCache(prevPath, prevProfileKey, prevWorkspaceId);
      workspaceDocRegistry.clearCache(prevPath, prevProfileKey, prevWorkspaceId);
    }

    // Also clear caches loaded during init that were never committed
    // (e.g. init exited early via isStale before setting syncState).
    if (
      loadedCacheScope &&
      (loadedCacheScope.vaultPath !== prevPath ||
        loadedCacheScope.profileKey !== prevProfileKey ||
        loadedCacheScope.workspaceId !== prevWorkspaceId)
    ) {
      clearSyncMirrorCache(loadedCacheScope.vaultPath, loadedCacheScope.profileKey, loadedCacheScope.workspaceId);
      workspaceDocRegistry.clearCache(loadedCacheScope.vaultPath, loadedCacheScope.profileKey, loadedCacheScope.workspaceId);
    }
    loadedCacheScope = null;

    // 重置同步锁
    syncLock = false;

    // 重置自动绑定状态
    resetAutoBindingState();

    syncState.reset();
    syncState.broadcast();
  },

  /**
   * 处理文件变化（由 vault-watcher 触发）
   */
  handleFileChange(
    type: 'add' | 'change' | 'unlink' | 'rename',
    absolutePath: string,
    oldAbsolutePath?: string
  ): void {
    const { vaultPath, status, profileKey, workspaceId } = syncState;
    if (!vaultPath || status === 'disabled' || !profileKey || !workspaceId) return;

    const relativePath = normalizeCloudSyncPath(getRelativePath(vaultPath, absolutePath));

    switch (type) {
      case 'add':
      case 'change': {
        const preparation = ensureFileId(vaultPath, profileKey, workspaceId, relativePath).catch(
          (error) => {
            log.error('register fileId failed:', relativePath, error);
          }
        );
        trackPreparationTask(preparation);
        syncState.addPending(relativePath);
        activityTracker.addPending(relativePath, 'upload');
        scheduleSync(performSync);
        break;
      }

      case 'unlink': {
        syncState.addPending(relativePath);
        activityTracker.addPending(relativePath, 'delete');
        scheduleSync(performSync, SYNC_DELETION_DEBOUNCE_DELAY);
        break;
      }

      case 'rename': {
        const preparation = (async () => {
          if (oldAbsolutePath) {
            const oldRelativePath = normalizeCloudSyncPath(
              getRelativePath(vaultPath, oldAbsolutePath)
            );
            await moveFileId(vaultPath, profileKey, workspaceId, oldRelativePath, relativePath);
          }
          await ensureFileId(vaultPath, profileKey, workspaceId, relativePath);
        })().catch((error) => {
          log.error('register moved fileId failed:', relativePath, error);
        });
        trackPreparationTask(preparation);
        if (oldAbsolutePath) {
          const oldRelativePath = normalizeCloudSyncPath(
            getRelativePath(vaultPath, oldAbsolutePath)
          );
          activityTracker.removePending(oldRelativePath);
        }
        syncState.addPending(relativePath);
        activityTracker.addPending(relativePath, 'upload');
        scheduleSync(performSync);
        break;
      }
    }

    syncState.broadcast();
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
    return syncState.getSnapshot();
  },

  /**
   * 获取包含活动详情的状态快照
   */
  getStatusDetail(): SyncStatusDetail {
    return syncState.getStatusDetail();
  },

  /**
   * 订阅状态变化
   */
  onStatusChange(listener: (snapshot: SyncStatusSnapshot) => void): () => void {
    return syncState.subscribe(listener);
  },

  /**
   * 更新绑定后重新初始化
   */
  async reinit(): Promise<void> {
    const { vaultPath } = syncState;
    const nextVaultPath = vaultPath ?? (await getActiveVaultInfo())?.path ?? null;
    if (!nextVaultPath) {
      return;
    }

    await this.init(nextVaultPath);
  },
} as const;
