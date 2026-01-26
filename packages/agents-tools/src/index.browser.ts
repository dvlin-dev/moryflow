/**
 * [PROVIDES]: TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TaskRecord, TaskStatus, TaskPriority - Browser-safe exports
 * [DEPENDS]: task-labels, tasks-store
 * [POS]: Browser 入口，避免引入 Node 专用依赖（fast-glob 等）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from './task/task-labels';
export type {
  TasksStore,
  TasksStoreContext,
  TaskRecord,
  TaskDependency,
  TaskNote,
  TaskFile,
  TaskEvent,
  TaskStatus,
  TaskPriority,
  TaskFileRole,
  TaskFileInput,
  ListTasksQuery,
  CreateTaskInput,
  UpdateTaskInput,
  SetStatusInput,
  AddNoteInput,
  AddFilesInput,
  DeleteTaskInput,
} from './task/tasks-store';
