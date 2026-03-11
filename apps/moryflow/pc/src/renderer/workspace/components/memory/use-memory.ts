/**
 * [PROVIDES]: useMemoryPageState - Memory 占位页 overview 状态与刷新动作
 * [DEPENDS]: desktopAPI.memory, workspace/context
 * [POS]: PR 3 阶段 renderer 对 Memory gateway 的最小消费入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useCallback, useEffect, useState } from 'react';
import type { MemoryOverview } from '@shared/ipc';
import { useWorkspaceNav, useWorkspaceVault } from '../../context';

type MemoryPageState = {
  overview: MemoryOverview | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export const useMemoryPageState = (): MemoryPageState => {
  const { destination } = useWorkspaceNav();
  const { vault } = useWorkspaceVault();
  const [overview, setOverview] = useState<MemoryOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextOverview = await window.desktopAPI.memory.getOverview();
      setOverview(nextOverview);
    } catch (cause) {
      setOverview(null);
      setError(cause instanceof Error ? cause.message : 'Failed to load memory overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (destination !== 'memory') {
      return;
    }
    void refresh();
  }, [destination, vault?.path, refresh]);

  return {
    overview,
    loading,
    error,
    refresh,
  };
};
