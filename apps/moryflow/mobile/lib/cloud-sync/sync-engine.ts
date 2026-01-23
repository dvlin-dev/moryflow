/**
 * [INPUT]: vaultPath, 文件变更事件
 * [OUTPUT]: 同步状态、同步结果
 * [POS]: Cloud Sync 同步引擎入口，协调各模块，管理同步状态
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { create } from 'zustand';
import { getAccessToken, refreshAccessToken } from '@/lib/server/auth-session';
import { fileIndexManager } from '@/lib/vault/file-index';
import { createLogger } from '@/lib/agent-runtime';
import { cloudSyncApi, CloudSyncApiError } from './api-client';
import { readSettings, readBinding, writeSettings } from './store';
import { collectLocalFiles } from './file-collector';
import { executeActions } from './executor';
import { tryAutoBinding, resetAutoBindingState, setRetryCallback } from './auto-binding';
import {
  SYNC_DEBOUNCE_DELAY,
  createDefaultSettings,
  type SyncEngineStatus,
  type SyncStatusSnapshot,
  type CloudSyncSettings,
} from './const';

// ── 类型定义 ────────────────────────────────────────────────

interface SyncEngineState {
  // 状态
  status: SyncEngineStatus;
  vaultPath: string | null;
  vaultId: string | null;
  vaultName: string | null;
  lastSyncAt: number | null;
  error: string | null;
  pendingCount: number;

  // Settings
  settings: CloudSyncSettings | null;
}

interface SyncEngineActions {
  // 状态更新
  setStatus: (status: SyncEngineStatus) => void;
  setVault: (vaultPath: string | null, vaultId: string | null, vaultName: string | null) => void;
  setLastSync: (time: number | null) => void;
  setError: (error: string | null) => void;
  setPendingCount: (count: number) => void;
  setSettings: (settings: CloudSyncSettings) => void;

  // 获取快照
  getSnapshot: () => SyncStatusSnapshot;
}

type SyncEngineStore = SyncEngineState & SyncEngineActions;

// ── Zustand Store ────────────────────────────────────────────

export const useSyncEngineStore = create<SyncEngineStore>()((set, get) => ({
  // 初始状态
  status: 'disabled',
  vaultPath: null,
  vaultId: null,
  vaultName: null,
  lastSyncAt: null,
  error: null,
  pendingCount: 0,
  settings: null,

  // Actions
  setStatus: (status) => set({ status }),
  setVault: (vaultPath, vaultId, vaultName) => set({ vaultPath, vaultId, vaultName }),
  setLastSync: (time) => set({ lastSyncAt: time }),
  setError: (error) => set({ error }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setSettings: (settings) => set({ settings }),

  getSnapshot: () => {
    const state = get();
    return {
      status: state.status,
      vaultId: state.vaultId,
      vaultName: state.vaultName,
      lastSyncAt: state.lastSyncAt,
      error: state.error,
      pendingCount: state.pendingCount,
    };
  },
}));

// ── 同步锁 ────────────────────────────────────────────────────

const SYNC_LOCK_TIMEOUT = 5 * 60 * 1000;
let syncLock = false;
let syncLockTime = 0;

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
  const { vaultPath, vaultId, status, settings } = store;

  if (!vaultPath || !vaultId) return;
  if (status === 'disabled' || status === 'offline') return;
  if (!settings?.syncEnabled) return;

  try {
    store.setStatus('syncing');
    store.setError(null);

    // 收集本地文件
    const localFiles = await collectLocalFiles(vaultPath);

    // 获取同步差异
    const { actions } = await cloudSyncApi.syncDiff({
      vaultId,
      deviceId: settings.deviceId,
      localFiles,
    });

    if (actions.length === 0) {
      store.setLastSync(Date.now());
      store.setPendingCount(0);
      store.setStatus('idle');
      return;
    }

    // 执行同步操作
    const { completed, deleted, errors } = await executeActions(actions, vaultPath);

    if (errors.length > 0) {
      console.warn(`[CloudSync] ${errors.length} action(s) failed`);
    }

    // 提交同步结果
    if (completed.length > 0 || deleted.length > 0) {
      const commitResult = await cloudSyncApi.syncCommit({
        vaultId,
        deviceId: settings.deviceId,
        completed,
        deleted,
        vectorizeEnabled: settings.vectorizeEnabled,
      });

      if (!commitResult.success && commitResult.conflicts) {
        console.warn('[CloudSync] Commit has conflicts:', commitResult.conflicts);
      }
    }

    store.setLastSync(Date.now());
    store.setPendingCount(0);
    store.setStatus('idle');
  } catch (error) {
    if (error instanceof CloudSyncApiError) {
      store.setError(error.message);
      if (error.isUnauthorized) {
        store.setStatus('disabled');
      } else if (error.isServerError) {
        store.setStatus('offline');
      } else {
        store.setStatus('idle');
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      store.setError(errorMessage);
      store.setStatus('idle');
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

    // 加载 fileIndex 并扫描
    await fileIndexManager.load(vaultPath);
    const created = await fileIndexManager.scanAndCreateIds(vaultPath);
    if (created > 0) {
      logger.info(`fileIndex created ${created} new entries`);
    }

    // 自动绑定
    let binding = await readBinding(vaultPath);
    if (!binding) {
      logger.info('No binding found, trying auto binding...');
      binding = await tryAutoBinding(vaultPath);
      if (!binding) {
        logger.warn('Auto binding failed, entering degraded mode');
        store.setStatus('offline');
        store.setVault(vaultPath, null, null);
        store.setError('Auto binding failed, will retry later');
        return;
      }
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
