/**
 * [PROVIDES]: useTasks - Mobile Tasks 列表/详情拉取与订阅
 * [DEPENDS]: tasks-service, React hooks
 * [POS]: Mobile Chat Tasks 面板数据层
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TaskRecord } from '@anyhunt/agents-tools';
import {
  getTaskDetail,
  listTasks,
  onTasksChange,
  type TaskDetailResult,
} from '../agent-runtime/tasks-service';

type UseTasksOptions = {
  activeSessionId: string | null;
  enabled: boolean;
};

type UseTasksState = {
  tasks: TaskRecord[];
  detail: TaskDetailResult | null;
  selectedTaskId: string | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectTask: (taskId: string) => Promise<void>;
  clearSelection: () => void;
};

export const useTasks = ({ activeSessionId, enabled }: UseTasksOptions): UseTasksState => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [detail, setDetail] = useState<TaskDetailResult | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedTaskId(null);
    setDetail(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!activeSessionId) {
      setTasks([]);
      clearSelection();
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await listTasks(activeSessionId);
      setTasks(list);
      if (selectedTaskId) {
        const exists = list.some((task) => task.id === selectedTaskId);
        if (!exists) {
          clearSelection();
        } else {
          setIsDetailLoading(true);
          const nextDetail = await getTaskDetail(activeSessionId, selectedTaskId);
          setDetail(nextDetail);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      setIsDetailLoading(false);
    }
  }, [activeSessionId, selectedTaskId, clearSelection]);

  const selectTask = useCallback(
    async (taskId: string) => {
      if (!activeSessionId) {
        clearSelection();
        return;
      }
      setSelectedTaskId(taskId);
      setIsDetailLoading(true);
      try {
        const nextDetail = await getTaskDetail(activeSessionId, taskId);
        setDetail(nextDetail);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsDetailLoading(false);
      }
    },
    [activeSessionId, clearSelection]
  );

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const dispose = onTasksChange(() => {
      void refresh();
    });
    return () => {
      dispose?.();
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (activeSessionId) return;
    setTasks([]);
    clearSelection();
    setError(null);
  }, [activeSessionId, clearSelection]);

  return useMemo(
    () => ({
      tasks,
      detail,
      selectedTaskId,
      isLoading,
      isDetailLoading,
      error,
      refresh,
      selectTask,
      clearSelection,
    }),
    [
      tasks,
      detail,
      selectedTaskId,
      isLoading,
      isDetailLoading,
      error,
      refresh,
      selectTask,
      clearSelection,
    ]
  );
};
