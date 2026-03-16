/**
 * Cloud Sync - 防抖调度器
 * 单一职责：管理同步调度
 */

import { SYNC_DEBOUNCE_DELAY } from '../const.js';

// ── 同步调度 ────────────────────────────────────────────────

let syncDebounceTimer: NodeJS.Timeout | null = null;
let scheduledDeadline: number | null = null;

/** 调度一次同步（防抖，取已调度与新请求中更早的截止时间） */
export const scheduleSync = (
  performSync: () => Promise<void>,
  delay: number = SYNC_DEBOUNCE_DELAY
): void => {
  const now = Date.now();
  const requestedDeadline = now + delay;
  const effectiveDeadline =
    scheduledDeadline !== null ? Math.min(scheduledDeadline, requestedDeadline) : requestedDeadline;
  const effectiveDelay = Math.max(0, effectiveDeadline - now);

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  scheduledDeadline = effectiveDeadline;
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    scheduledDeadline = null;
    void performSync();
  }, effectiveDelay);
};

/** 取消已调度的同步 */
export const cancelScheduledSync = (): void => {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  scheduledDeadline = null;
};

/** 检查是否有等待中的同步 */
export const hasPendingSync = (): boolean => syncDebounceTimer !== null;
