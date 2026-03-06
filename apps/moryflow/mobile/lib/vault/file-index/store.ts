/**
 * [INPUT]: vaultPath, FileIndexStore
 * [OUTPUT]: FileIndexStore（持久化读写结果）
 * [POS]: Mobile FileIndex IO 层（严格 v2，无历史迁移）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FileIndexStore } from '@moryflow/api';
import { createLogger } from '@/lib/agent-runtime';

const getStorageKey = (vaultPath: string) => `moryflow:file-index:${vaultPath}`;

const CURRENT_VERSION = 2;
const logger = createLogger('[FileIndex]');

const createEmptyStore = (): FileIndexStore => ({
  version: CURRENT_VERSION,
  files: [],
});

/** 从 AsyncStorage 加载 */
export const loadStore = async (vaultPath: string): Promise<FileIndexStore> => {
  try {
    const data = await AsyncStorage.getItem(getStorageKey(vaultPath));
    if (!data) return createEmptyStore();
    const parsed = JSON.parse(data) as FileIndexStore;
    if (!parsed || parsed.version !== CURRENT_VERSION || !Array.isArray(parsed.files)) {
      logger.warn('Invalid file index store, resetting', {
        vaultPath,
        version: parsed?.version,
      });
      return createEmptyStore();
    }
    return parsed;
  } catch (error) {
    logger.error('Failed to load file index store, resetting', error);
    return createEmptyStore();
  }
};

/** 保存到 AsyncStorage */
export const saveStore = async (
  vaultPath: string,
  store: Pick<FileIndexStore, 'files'>
): Promise<void> => {
  const storeWithVersion: FileIndexStore = {
    version: CURRENT_VERSION,
    files: store.files,
  };
  await AsyncStorage.setItem(getStorageKey(vaultPath), JSON.stringify(storeWithVersion));
};
