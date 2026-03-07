/**
 * [PROVIDES]: TASK_STATUS_LABELS, TaskState, TaskItem, TaskStatus - Browser-safe exports
 * [DEPENDS]: task-labels, task-state
 * [POS]: Browser 入口，避免引入 Node 专用依赖（fast-glob 等）
 * [UPDATE]: 2026-03-07 - 导出收敛为轻量 session-scoped task snapshot
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export { TASK_STATUS_LABELS } from './task/task-labels';
export {
  EMPTY_TASK_STATE,
  MAX_TASK_ITEMS,
  MAX_TASK_NOTE_LENGTH,
  MAX_TASK_TITLE_LENGTH,
  TaskValidationError,
  clearDoneTaskState,
  isTaskValidationError,
  normalizeTaskState,
  type TaskStateService,
  type TaskState,
  type TaskItem,
  type TaskItemInput,
  type TaskStatus,
} from './task/task-state';
