/**
 * [PROVIDES]: createReadTool, createWriteTool, createGlobTool, createBaseTools - Agent 工具集
 * [DEPENDS]: agents-core, agents-adapter - 工具接口与平台适配
 * [POS]: 平台无关的工具定义层，被 pc/main 和 mobile 的 agent-runtime 依赖
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// 共享工具函数和常量
export * from './shared'

// 工具创建器
export { createReadTool } from './file/read-tool'
export {
  createWriteTool,
  applyWriteOperation,
  writeOperationSchema,
  type WriteOperationInput,
  type ApplyWriteOperationDeps,
} from './file/write-tool'
export { createEditTool } from './file/edit-tool'
export { createDeleteTool } from './file/delete-tool'
export { createMoveTool } from './file/move-tool'
export { createLsTool } from './file/ls-tool'
export { createGlobTool } from './search/glob-tool'
export { createGrepTool } from './search/grep-tool'
export { createSearchInFileTool } from './search/search-in-file-tool'
export { createWebFetchTool } from './web/web-fetch-tool'
export { createWebSearchTool } from './web/web-search-tool'
export {
  createManagePlanTool,
  readPlan,
  setPlanStore,
  type PlanStore,
  type PlanTask,
  type PlanSnapshot,
  type TaskStatus,
} from './task/manage-plan'
export { createTaskTool, type SubAgentToolsConfig, type SubAgentType } from './task/task-tool'

// 平台特定工具（需要平台能力支持）
export { createBashTool } from './platform/bash-tool'

// 图片生成工具
export { createGenerateImageTool } from './image/generate-image-tool'

// 工具集创建器
export {
  createBaseTools,
  createBaseToolsWithoutTask,
  type ToolsContext,
} from './create-tools'

// Glob 抽象层
export {
  // 接口
  type GlobImpl,
  type GlobOptions,
  type GlobEntry,
  setGlobImpl,
  getGlobImpl,
  isGlobImplInitialized,
  // Node.js 实现
  nodeGlobImpl,
  initNodeGlob,
  // Mobile 实现
  createMobileGlobImpl,
  initMobileGlob,
} from './glob'

