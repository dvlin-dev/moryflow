/**
 * [DEFINES]: Tasks IPC types（list/get/change event）
 * [USED_BY]: preload desktopAPI / main IPC handlers / renderer Tasks UI
 * [POS]: PC 端 Tasks IPC 类型定义入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type {
  TasksStatus as TaskStatus,
  TaskPriority,
  TaskRecord,
  TaskDependency,
  TaskNote,
  TaskFile,
  ListTasksQuery,
} from '@moryflow/agents-tools';

export type { TaskStatus, TaskPriority, TaskRecord, TaskDependency, TaskNote, TaskFile };

export type TasksListInput = ListTasksQuery & {
  chatId: string;
};

export type TasksGetInput = {
  chatId: string;
  taskId: string;
};

export type TaskDetailResult = {
  task: TaskRecord;
  dependencies: TaskDependency[];
  notes: TaskNote[];
  files: TaskFile[];
};

export type TasksChangeEvent = {
  changedAt: number;
};
