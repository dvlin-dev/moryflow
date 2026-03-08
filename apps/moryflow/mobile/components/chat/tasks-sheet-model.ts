/**
 * [PROVIDES]: buildTaskSheetRows, TASK_STATUS_LABEL_KEYS
 * [DEPENDS]: @moryflow/agents-runtime task-state
 * [POS]: Mobile TasksSheet 的 snapshot-only 展示模型
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
