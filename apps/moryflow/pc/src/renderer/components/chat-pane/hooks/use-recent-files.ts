/**
 * [PROVIDES]: useRecentFiles - 最近操作文件列表（MRU）
 * [DEPENDS]: desktopAPI.workspace, FlatFile
 * [POS]: Chat Pane @ 引用默认列表
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FlatFile } from '@/workspace/utils';

const MAX_RECENT_FILES = 3;

export const useRecentFiles = (vaultPath: string | null, allFiles: FlatFile[]) => {
  const [recentPaths, setRecentPaths] = useState<string[]>([]);

  const refreshRecentFiles = useCallback(async () => {
    if (!vaultPath) {
      setRecentPaths([]);
      return;
    }
    try {
      const paths = await window.desktopAPI.workspace.getRecentFiles(vaultPath);
      setRecentPaths(Array.isArray(paths) ? paths : []);
    } catch (error) {
      console.warn('[useRecentFiles] Failed to fetch recent files:', error);
      setRecentPaths([]);
    }
  }, [vaultPath]);

  useEffect(() => {
    void refreshRecentFiles();
  }, [refreshRecentFiles]);

  const recentFiles = useMemo(() => {
    if (!vaultPath) {
      return [];
    }
    const byPath = new Map(allFiles.map((file) => [file.path, file]));
    const resolved = recentPaths
      .map((path) => byPath.get(path))
      .filter((file): file is FlatFile => Boolean(file))
      .slice(0, MAX_RECENT_FILES);

    if (resolved.length > 0) {
      return resolved;
    }

    return [...allFiles].sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0)).slice(0, MAX_RECENT_FILES);
  }, [allFiles, recentPaths, vaultPath]);

  return { recentFiles, refreshRecentFiles };
};
