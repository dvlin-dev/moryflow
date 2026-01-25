/**
 * [INPUT]: vaultPath - 本地 Vault 路径
 * [OUTPUT]: VaultBinding | null - 绑定结果
 * [POS]: 实现登录后自动绑定 Vault 到云端
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Paths } from 'expo-file-system';
import { createLogger } from '@/lib/agent-runtime';
import { cloudSyncApi, CloudSyncApiError } from './api-client';
import { readBinding, writeBinding, readSettings } from './store';
import { fetchCurrentUserId } from './user-info';
import type { VaultBinding } from './const';

// ── 常量 ────────────────────────────────────────────────────

const MAX_RETRY_COUNT = 3;
const RETRY_BASE_DELAY = 2000;
const logger = createLogger('[CloudSync]');

// ── 重试状态 ────────────────────────────────────────────────

interface RetryState {
  count: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const retryState = new Map<string, RetryState>();

// 重试回调（由 sync-engine 注入）
let onRetryCallback: (() => void) | null = null;

/**
 * 设置重试回调
 */
export function setRetryCallback(callback: () => void): void {
  onRetryCallback = callback;
}

// ── 错误判断 ────────────────────────────────────────────────

const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('failed to fetch') ||
      msg.includes('network request failed') ||
      msg.includes('abort')
    );
  }
  return false;
};

const shouldRetry = (error: unknown): boolean => {
  if (isNetworkError(error)) return true;
  if (error instanceof CloudSyncApiError) {
    return error.isServerError;
  }
  return false;
};

// ── 核心函数 ────────────────────────────────────────────────

/**
 * 尝试自动绑定 Vault
 */
export async function tryAutoBinding(vaultPath: string): Promise<VaultBinding | null> {
  const existing = await readBinding(vaultPath);
  if (existing) {
    logger.info('Vault already bound:', vaultPath);
    return existing;
  }

  try {
    return await performAutoBinding(vaultPath);
  } catch (error) {
    logger.error('Auto binding failed:', error);

    let state = retryState.get(vaultPath);
    if (!state) {
      state = { count: 0, timer: null };
      retryState.set(vaultPath, state);
    }
    state.count++;

    if (state.count < MAX_RETRY_COUNT && shouldRetry(error)) {
      logger.info(`Scheduling retry ${state.count}/${MAX_RETRY_COUNT}`);
      scheduleRetry(vaultPath, state.count);
    } else {
      logger.warn('Max retry reached or non-retryable error');
      clearRetryState(vaultPath);
    }

    return null;
  }
}

async function performAutoBinding(vaultPath: string): Promise<VaultBinding> {
  const settings = await readSettings();
  const localVaultName = Paths.basename(vaultPath);

  logger.info('Attempting auto binding:', { vaultPath, localVaultName });

  const userId = await fetchCurrentUserId();
  if (!userId) {
    throw new Error('Cannot determine current user ID');
  }

  const { vaults } = await cloudSyncApi.listVaults();
  const matched = vaults.find((v) => v.name === localVaultName);

  let vaultId: string;
  let vaultName: string;

  if (matched) {
    logger.info('Matched existing vault:', matched.id, matched.name);
    vaultId = matched.id;
    vaultName = matched.name;
  } else {
    logger.info('Creating new vault:', localVaultName);
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
  await writeBinding(binding);

  logger.info('Auto binding succeeded:', { vaultId, vaultName, isNewVault: !matched });
  clearRetryState(vaultPath);

  return binding;
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
