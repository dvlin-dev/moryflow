/**
 * [PROVIDES]: useWorkspaceFiles - 获取工作区所有文件的 hook
 * [DEPENDS]: flattenTreeToFiles, desktopAPI.vault.readTree
 * [POS]: 为引用文件面板提供工作区文件列表
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { flattenTreeToFiles, type FlatFile } from '@/workspace/utils';

/**
 * 获取工作区所有文件列表
 * @param vaultPath 工作区路径
 * @returns files - 扁平化的文件列表, refresh - 刷新文件列表
 */
export const useWorkspaceFiles = (vaultPath: string | null) => {
  const [files, setFiles] = useState<FlatFile[]>([]);
  const requestIdRef = useRef(0);
  const vaultPathRef = useRef<string | null>(vaultPath);

  useEffect(() => {
    vaultPathRef.current = vaultPath;
  }, [vaultPath]);

  const fetchFiles = useCallback(async () => {
    if (!vaultPath) {
      setFiles([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    const currentVaultPath = vaultPath;

    try {
      const nodes = await window.desktopAPI.vault.readTree(currentVaultPath);
      if (requestId !== requestIdRef.current || vaultPathRef.current !== currentVaultPath) {
        return;
      }
      setFiles(flattenTreeToFiles(nodes));
    } catch (error) {
      if (requestId !== requestIdRef.current || vaultPathRef.current !== currentVaultPath) {
        return;
      }
      console.error('[useWorkspaceFiles] Failed to fetch tree cache:', error);
      setFiles([]);
    }
  }, [vaultPath]);

  useEffect(() => {
    fetchFiles();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchFiles]);

  return { files, refresh: fetchFiles };
};
