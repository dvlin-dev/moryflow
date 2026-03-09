/**
 * [PROVIDES]: TASK_STATUS_LABELS, TaskState, TaskItem, TaskStatus - Browser-safe exports
 * [DEPENDS]: task-labels, task-state
 * [POS]: Browser 入口，避免引入 Node 专用依赖（fast-glob 等）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
