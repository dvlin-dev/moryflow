/**
 * [PROVIDES]: fileId 注册/查询/迁移入口
 * [DEPENDS]: file-index, path-normalizer
 * [POS]: PC 侧 fileId 事实源边界
 */

import { fileIndexManager } from './file-index/index.js';
import { normalizeCloudSyncPath } from './path-normalizer.js';

export async function ensureFileId(vaultPath: string, relativePath: string): Promise<string> {
  return fileIndexManager.getOrCreate(vaultPath, normalizeCloudSyncPath(relativePath));
}

export async function removeFileId(
  vaultPath: string,
  relativePath: string
): Promise<string | null> {
  return fileIndexManager.delete(vaultPath, normalizeCloudSyncPath(relativePath));
}

export async function moveFileId(
  vaultPath: string,
  oldRelativePath: string,
  newRelativePath: string
): Promise<void> {
  await fileIndexManager.move(
    vaultPath,
    normalizeCloudSyncPath(oldRelativePath),
    normalizeCloudSyncPath(newRelativePath)
  );
}
