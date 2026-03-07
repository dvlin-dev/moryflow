/**
 * [PROVIDES]: createMobileTools, createTaskTool, TaskState - React Native-safe exports
 * [DEPENDS]: mobile tools, task snapshot model, glob-mobile
 * [POS]: React Native 入口，避免引入 Node 专用依赖（fast-glob 等）
 * [UPDATE]: 2026-03-07 - 重型 tasks_* 导出收敛为单一 task snapshot 协议
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
export { createTaskTool } from './task/task-tool';
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
export { TASK_STATUS_LABELS } from './task/task-labels';
export {
  createSubagentTool,
  type SubAgentToolsConfig,
  type SubAgentInstructionsConfig,
} from './task/subagent-tool';

// 工具集创建器 - 使用 Mobile 专用版本
export {
  createMobileTools,
  createMobileToolsWithoutSubagent,
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
