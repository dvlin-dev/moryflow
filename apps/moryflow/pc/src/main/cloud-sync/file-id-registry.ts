/**
 * [PROVIDES]: documentId 注册/查询/迁移入口
 * [DEPENDS]: workspace-doc-registry, path-normalizer
 * [POS]: PC 侧 document identity 事实源边界
 */

import { normalizeCloudSyncPath } from './path-normalizer.js';
import { workspaceDocRegistry } from '../workspace-doc-registry/index.js';

export async function ensureFileId(vaultPath: string, relativePath: string): Promise<string> {
  return workspaceDocRegistry.ensureDocumentId(
    vaultPath,
    normalizeCloudSyncPath(relativePath),
  );
}

export async function removeFileId(
  vaultPath: string,
  relativePath: string
): Promise<string | null> {
  return workspaceDocRegistry.delete(vaultPath, normalizeCloudSyncPath(relativePath));
}

export async function moveFileId(
  vaultPath: string,
  oldRelativePath: string,
  newRelativePath: string
): Promise<void> {
  await workspaceDocRegistry.move(
    vaultPath,
    normalizeCloudSyncPath(oldRelativePath),
    normalizeCloudSyncPath(newRelativePath),
  );
}
