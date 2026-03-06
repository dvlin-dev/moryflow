/**
 * [INPUT]: vaultPath, FileIndexStore
 * [OUTPUT]: FileIndexStore（持久化读写结果）
 * [POS]: PC FileIndex IO 层（严格 v2，无历史迁移）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { FileIndexStore } from '@moryflow/api';
import { FILE_INDEX_STORE_PATH } from '../const.js';
import { createLogger } from '../logger.js';

const getStorePath = (vaultPath: string) => path.join(vaultPath, FILE_INDEX_STORE_PATH);

/** 当前版本号 */
const CURRENT_VERSION = 2;
const logger = createLogger('file-index');

const createEmptyStore = (): FileIndexStore => ({
  version: CURRENT_VERSION,
  files: [],
});

/** 从文件加载（严格校验，不做旧版迁移） */
export const loadStore = async (vaultPath: string): Promise<FileIndexStore> => {
  try {
    const content = await readFile(getStorePath(vaultPath), 'utf-8');
    const parsed = JSON.parse(content) as FileIndexStore;

    if (!parsed || parsed.version !== CURRENT_VERSION || !Array.isArray(parsed.files)) {
      logger.warn('invalid file index store, resetting', {
        vaultPath,
        version: parsed?.version,
      });
      return createEmptyStore();
    }

    return parsed;
  } catch (error) {
    logger.error('failed to load file index store, resetting', error);
    return createEmptyStore();
  }
};

/** 保存到文件 */
export const saveStore = async (
  vaultPath: string,
  store: Pick<FileIndexStore, 'files'>
): Promise<void> => {
  const storePath = getStorePath(vaultPath);
  await mkdir(path.dirname(storePath), { recursive: true });
  // 确保保存时带版本号
  const storeWithVersion: FileIndexStore = {
    version: CURRENT_VERSION,
    files: store.files,
  };
  await writeFile(storePath, JSON.stringify(storeWithVersion, null, 2));
};
