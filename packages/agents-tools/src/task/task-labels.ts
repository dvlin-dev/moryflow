/**
 * [PROVIDES]: TASK_STATUS_LABELS
 * [DEPENDS]: task-state types
 * [POS]: 轻量 task 展示层状态文案映射（PC/Mobile 共享）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { TaskStatus } from './task-state';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
};
