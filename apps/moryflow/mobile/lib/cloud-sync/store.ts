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
  generateDeviceId,
  type CloudSyncSettings,
  type VaultBinding,
} from './const';

// UUID 格式校验正则
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const logger = createLogger('[CloudSync]');

// ── Settings ────────────────────────────────────────────────

export const readSettings = async (): Promise<CloudSyncSettings> => {
  try {
    const stored = await SecureStore.getItemAsync(STORE_KEYS.SETTINGS);
    if (stored) {
      const settings = JSON.parse(stored) as CloudSyncSettings;
      // 迁移：如果 deviceId 不是有效 UUID 格式，重新生成
      if (!UUID_REGEX.test(settings.deviceId)) {
        logger.info('Migrating invalid deviceId to UUID format');
        settings.deviceId = generateDeviceId();
        await writeSettings(settings);
      }
      return settings;
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
      return JSON.parse(stored);
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
