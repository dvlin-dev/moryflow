/**
 * /agents-tools - React Native 入口
 *
 * 这个文件是为 React Native 环境准备的入口点。
 * 它不会自动初始化 glob 实现（需要手动调用 initMobileGlob），
 * 从而避免导入 fast-glob 及其 Node.js 依赖。
 */

// 共享工具函数和常量
export * from './shared';

// 工具创建器
export { createReadTool } from './file/read-tool';
export {
  createWriteTool,
  applyWriteOperation,
  writeOperationSchema,
  type WriteOperationInput,
  type ApplyWriteOperationDeps,
} from './file/write-tool';
export { createEditTool } from './file/edit-tool';
export { createDeleteTool } from './file/delete-tool';
export { createMoveTool } from './file/move-tool';
export { createLsTool } from './file/ls-tool';
export { createGlobTool } from './search/glob-tool';
export { createGrepTool } from './search/grep-tool';
export { createSearchInFileTool } from './search/search-in-file-tool';
export { createWebFetchTool } from './web/web-fetch-tool';
export { createWebSearchTool } from './web/web-search-tool';
export { createTasksTools } from './task/tasks-tools';
export {
  TASKS_SCHEMA_VERSION,
  TASKS_SCHEMA_MIGRATIONS,
  TASKS_PRAGMAS,
  type TasksStore,
  type TasksStoreContext,
  type TaskRecord,
  type TaskDependency,
  type TaskNote,
  type TaskFile,
  type TaskEvent,
  type TaskStatus as TasksStatus,
  type TaskPriority,
  type TaskFileRole,
  type TaskFileInput,
  type ListTasksQuery,
  type CreateTaskInput,
  type UpdateTaskInput,
  type SetStatusInput,
  type AddNoteInput,
  type AddFilesInput,
  type DeleteTaskInput,
} from './task/tasks-store';
export { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from './task/task-labels';
export { createTaskTool, type SubAgentToolsConfig, type SubAgentType } from './task/task-tool';

// 平台特定工具（React Native 不支持）
// export { createBashTool } from './platform/bash-tool'

// 工具集创建器 - 使用 Mobile 专用版本
export {
  createMobileTools,
  createMobileToolsWithoutTask,
  type ToolsContext,
} from './create-tools-mobile';

// Glob 抽象层 - 只导出 Mobile 实现
export {
  // 接口
  type GlobImpl,
  type GlobOptions,
  type GlobEntry,
  setGlobImpl,
  getGlobImpl,
  isGlobImplInitialized,
} from './glob/glob-interface';

// Mobile glob 实现
export { createMobileGlobImpl, initMobileGlob } from './glob/glob-mobile';
