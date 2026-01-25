/**
 * [PROVIDES]: TASK_STATUS_LABELS / TASK_PRIORITY_LABELS
 * [DEPENDS]: tasks-store types
 * [POS]: Tasks 展示层的通用文案映射（PC/Mobile 共享）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { TaskStatus, TaskPriority } from './tasks-store';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  p0: 'P0',
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
};
