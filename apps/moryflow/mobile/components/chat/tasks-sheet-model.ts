/**
 * [PROVIDES]: buildTaskSheetRows, TASK_STATUS_LABEL_KEYS
 * [DEPENDS]: @moryflow/agents-runtime task-state
 * [POS]: Mobile TasksSheet 的 snapshot-only 展示模型
 * [UPDATE]: 2026-03-07 - 收敛为只读 checklist rows，删除 detail/selection 语义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { TaskState, TaskStatus } from '@moryflow/agents-runtime';

export type TaskSheetRow = {
  id: string;
  title: string;
  status: TaskStatus;
  note?: string;
};

export const TASK_STATUS_LABEL_KEYS: Record<TaskStatus, string> = {
  todo: 'taskStatusTodo',
  in_progress: 'taskStatusInProgress',
  done: 'taskStatusDone',
};

export const buildTaskSheetRows = (taskState?: TaskState): TaskSheetRow[] => {
  if (!taskState) {
    return [];
  }

  return taskState.items.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    ...(item.note ? { note: item.note } : {}),
  }));
};
