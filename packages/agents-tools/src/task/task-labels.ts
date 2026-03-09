/**
 * [PROVIDES]: TASK_STATUS_LABELS
 * [DEPENDS]: task-state types
 * [POS]: 轻量 task 展示层状态文案映射（PC/Mobile 共享）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { TaskStatus } from './task-state';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
};
