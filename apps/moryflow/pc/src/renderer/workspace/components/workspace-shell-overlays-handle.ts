/**
 * [INPUT]: SearchFileHit
 * [OUTPUT]: VaultTreeNode（搜索结果打开文件用）
 * [POS]: WorkspaceShellOverlays 搜索命中映射
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { SearchFileHit, VaultTreeNode } from '@shared/ipc';

const normalizeForCompare = (value: string): string => value.replace(/\\/g, '/');

const resolveRelativeNodeId = (hit: SearchFileHit, absoluteFilePath: string): string => {
  const relativePath = hit.relativePath.trim();
  if (relativePath.length > 0) {
    return relativePath;
  }

  const normalizedVaultPath = normalizeForCompare(hit.vaultPath.trim()).replace(/\/+$/, '');
  const normalizedFilePath = normalizeForCompare(absoluteFilePath);
  if (normalizedVaultPath.length > 0 && normalizedFilePath.startsWith(`${normalizedVaultPath}/`)) {
    const derived = normalizedFilePath.slice(normalizedVaultPath.length + 1);
    if (derived.length > 0) {
      return derived;
    }
  }

  return absoluteFilePath.split(/[\\/]/).pop() ?? absoluteFilePath;
};

export const toSearchHitFileNode = (hit: SearchFileHit): VaultTreeNode | null => {
  const absoluteFilePath = hit.filePath.trim();
  if (absoluteFilePath.length === 0) {
    return null;
  }

  const fallbackName = absoluteFilePath.split(/[\\/]/).pop() || absoluteFilePath;
  return {
    id: resolveRelativeNodeId(hit, absoluteFilePath),
    name: hit.fileName || fallbackName,
    path: absoluteFilePath,
    type: 'file',
  };
};
