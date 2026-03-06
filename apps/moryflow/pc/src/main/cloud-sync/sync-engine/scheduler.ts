/**
 * Cloud Sync - 防抖调度器
 * 单一职责：管理同步调度
 */

import { SYNC_DEBOUNCE_DELAY } from '../const.js';

// ── 同步调度 ────────────────────────────────────────────────

let syncDebounceTimer: NodeJS.Timeout | null = null;

/** 调度一次同步（防抖） */
export const scheduleSync = (performSync: () => Promise<void>): void => {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    void performSync();
  }, SYNC_DEBOUNCE_DELAY);
};

/** 取消已调度的同步 */
export const cancelScheduledSync = (): void => {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
};

/** 检查是否有等待中的同步 */
export const hasPendingSync = (): boolean => syncDebounceTimer !== null;
