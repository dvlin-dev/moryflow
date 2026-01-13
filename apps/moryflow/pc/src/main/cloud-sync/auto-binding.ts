/**
 * Cloud Sync - 自动绑定模块
 * [INPUT]: vaultPath - 本地 Vault 路径
 * [OUTPUT]: VaultBinding | null - 绑定结果
 * [POS]: 被 sync-engine/index.ts 的 init 方法调用，实现登录后自动绑定
 * [DOC]: docs/products/moryflow/features/cloud-sync/auto-binding-impl.md
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import path from 'node:path';
import { cloudSyncApi, CloudSyncApiError } from './api/client.js';
import { readBinding, writeBinding, readSettings } from './store.js';
import { createLogger } from './logger.js';
import { isNetworkError } from './errors.js';
import { fetchCurrentUserId } from './user-info.js';
import type { VaultBinding } from './const.js';

const log = createLogger('auto-binding');

// ── 常量 ────────────────────────────────────────────────────

const MAX_RETRY_COUNT = 3;
const RETRY_BASE_DELAY = 2000;

// ── 重试状态 ────────────────────────────────────────────────

interface RetryState {
  count: number;
  timer: NodeJS.Timeout | null;
}

const retryState = new Map<string, RetryState>();

// 重试回调（由 sync-engine 注入，避免循环依赖）
let onRetryCallback: (() => void) | null = null;

/**
 * 设置重试回调（由 sync-engine 调用）
 */
export function setRetryCallback(callback: () => void): void {
  onRetryCallback = callback;
}

// ── 核心函数 ────────────────────────────────────────────────

/**
 * 尝试自动绑定 Vault
 */
export async function tryAutoBinding(vaultPath: string): Promise<VaultBinding | null> {
  const existing = readBinding(vaultPath);
  if (existing) {
    log.info('vault already bound:', vaultPath);
    return existing;
  }

  try {
    return await performAutoBinding(vaultPath);
  } catch (error) {
    log.error('auto binding failed:', error);

    let state = retryState.get(vaultPath);
    if (!state) {
      state = { count: 0, timer: null };
      retryState.set(vaultPath, state);
    }
    state.count++;

    if (state.count < MAX_RETRY_COUNT && shouldRetry(error)) {
      log.info(`scheduling retry ${state.count}/${MAX_RETRY_COUNT}`);
      scheduleRetry(vaultPath, state.count);
    } else {
      log.warn('max retry reached or non-retryable error');
      clearRetryState(vaultPath);
    }

    return null;
  }
}

async function performAutoBinding(vaultPath: string): Promise<VaultBinding> {
  const settings = readSettings();
  const localVaultName = path.basename(vaultPath);

  log.info('attempting auto binding:', { vaultPath, localVaultName });

  // 获取当前用户 ID
  const userId = await fetchCurrentUserId();
  if (!userId) {
    throw new Error('Cannot determine current user ID');
  }

  const { vaults } = await cloudSyncApi.listVaults();
  const matched = vaults.find((v) => v.name === localVaultName);

  let vaultId: string;
  let vaultName: string;

  if (matched) {
    log.info('matched existing vault:', matched.id, matched.name);
    vaultId = matched.id;
    vaultName = matched.name;
  } else {
    log.info('creating new vault:', localVaultName);
    const created = await cloudSyncApi.createVault(localVaultName);
    vaultId = created.id;
    vaultName = created.name;
  }

  await cloudSyncApi.registerDevice(vaultId, settings.deviceId, settings.deviceName);

  const binding: VaultBinding = {
    localPath: vaultPath,
    vaultId,
    vaultName,
    boundAt: Date.now(),
    userId,
  };
  writeBinding(binding);

  log.info('auto binding succeeded:', { vaultId, vaultName, userId, isNewVault: !matched });
  clearRetryState(vaultPath);

  return binding;
}

function shouldRetry(error: unknown): boolean {
  if (isNetworkError(error)) return true;
  if (error instanceof CloudSyncApiError) {
    return error.isServerError;
  }
  return false;
}

function scheduleRetry(vaultPath: string, retryCount: number): void {
  const state = retryState.get(vaultPath);
  if (!state) return;

  if (state.timer) {
    clearTimeout(state.timer);
  }

  const delay = RETRY_BASE_DELAY * retryCount;

  state.timer = setTimeout(() => {
    if (onRetryCallback) {
      onRetryCallback();
    }
  }, delay);

  retryState.set(vaultPath, state);
}

function clearRetryState(vaultPath: string): void {
  const state = retryState.get(vaultPath);
  if (state?.timer) {
    clearTimeout(state.timer);
  }
  retryState.delete(vaultPath);
}

/**
 * 重置所有重试状态
 */
export function resetAutoBindingState(): void {
  for (const [, state] of retryState) {
    if (state.timer) clearTimeout(state.timer);
  }
  retryState.clear();
}
