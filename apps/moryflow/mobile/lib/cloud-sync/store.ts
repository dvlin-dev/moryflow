/**
 * [INPUT]: Settings 和 Binding 数据
 * [OUTPUT]: 持久化存储操作结果
 * [POS]: Cloud Sync 持久化存储层，使用 SecureStore（加密存储）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import * as SecureStore from 'expo-secure-store';
import { createLogger } from '@/lib/agent-runtime';
import {
  STORE_KEYS,
  createDefaultSettings,
  type CloudSyncSettings,
  type VaultBinding,
} from './const';
const logger = createLogger('[CloudSync]');

// ── Settings ────────────────────────────────────────────────

export const readSettings = async (): Promise<CloudSyncSettings> => {
  try {
    const stored = await SecureStore.getItemAsync(STORE_KEYS.SETTINGS);
    if (stored) {
      const settings = JSON.parse(stored) as CloudSyncSettings;
      if (
        typeof settings?.syncEnabled === 'boolean' &&
        typeof settings?.vectorizeEnabled === 'boolean' &&
        typeof settings?.deviceId === 'string' &&
        typeof settings?.deviceName === 'string'
      ) {
        return settings;
      }
    }
  } catch (error) {
    logger.error('Failed to read settings:', error);
  }
  return createDefaultSettings();
};

export const writeSettings = async (settings: CloudSyncSettings): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(STORE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    logger.error('Failed to write settings:', error);
    return false;
  }
};

// ── Bindings ────────────────────────────────────────────────

export const readBindings = async (): Promise<Record<string, VaultBinding>> => {
  try {
    const stored = await SecureStore.getItemAsync(STORE_KEYS.BINDINGS);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, Partial<VaultBinding>>;
      const sanitized: Record<string, VaultBinding> = {};
      for (const [key, binding] of Object.entries(parsed)) {
        const localPath = typeof binding?.localPath === 'string' ? binding.localPath : key;
        if (
          typeof binding?.vaultId === 'string' &&
          typeof binding?.vaultName === 'string' &&
          typeof binding?.boundAt === 'number'
        ) {
          sanitized[key] = {
            localPath,
            vaultId: binding.vaultId,
            vaultName: binding.vaultName,
            boundAt: binding.boundAt,
            userId: typeof binding?.userId === 'string' ? binding.userId : '',
          };
        }
      }
      return sanitized;
    }
  } catch (error) {
    logger.error('Failed to read bindings:', error);
  }
  return {};
};

export const readBinding = async (localPath: string): Promise<VaultBinding | null> => {
  const bindings = await readBindings();
  return bindings[localPath] ?? null;
};

export const writeBinding = async (binding: VaultBinding): Promise<boolean> => {
  try {
    const bindings = await readBindings();
    bindings[binding.localPath] = binding;
    await SecureStore.setItemAsync(STORE_KEYS.BINDINGS, JSON.stringify(bindings));
    return true;
  } catch (error) {
    logger.error('Failed to write binding:', error);
    return false;
  }
};

export const deleteBinding = async (localPath: string): Promise<boolean> => {
  try {
    const bindings = await readBindings();
    delete bindings[localPath];
    await SecureStore.setItemAsync(STORE_KEYS.BINDINGS, JSON.stringify(bindings));
    return true;
  } catch (error) {
    logger.error('Failed to delete binding:', error);
    return false;
  }
};
