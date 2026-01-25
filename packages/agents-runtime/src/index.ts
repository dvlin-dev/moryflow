/**
 * [PROVIDES]: createAgentFactory/createModelFactory/createVaultUtils/ToolOutputTruncation - Agent 运行时核心
 * [DEPENDS]: @openai/agents-core, @openai/agents-extensions - 底层 Agent 框架
 * [POS]: 平台无关的运行时抽象，被 pc/main 和 mobile 的 agent-runtime 依赖
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// 类型导出
export * from './types';

// 核心模块
export { createAgentFactory, type AgentFactory } from './agent-factory';
export {
  createModelFactory,
  type ModelFactory,
  type BuildModelOptions,
  type BuildModelResult,
} from './model-factory';
export { buildReasoningProviderOptions } from './reasoning-config';
export { applyContextToInput } from './context';
export { getMorySystemPrompt } from './prompt';

// 会话管理
export {
  createSessionAdapter,
  type Session,
  type SessionStore,
  type ChatSessionSummary,
} from './session';

// Vault 工具
export { createVaultUtils, type VaultUtils, type VaultFileData } from './vault-utils';

// 自动续写
export {
  shouldContinueForTruncation,
  buildTruncateContinuePrompt,
  DEFAULT_AUTO_CONTINUE_CONFIG,
  type AutoContinueConfig,
} from './auto-continue';

// 标题生成
export { generateChatTitle } from './title-generator';

// Tool 输出截断
export {
  DEFAULT_TOOL_OUTPUT_TRUNCATION,
  createToolOutputPostProcessor,
  isTruncatedToolOutput,
  wrapToolWithOutputTruncation,
  wrapToolsWithOutputTruncation,
  type ToolOutputTruncationConfig,
  type ToolOutputStorage,
  type ToolOutputStorageWriteInput,
  type ToolOutputStorageWriteResult,
  type ToolOutputPostProcessor,
  type ToolOutputPostProcessorOptions,
  type TruncatedToolOutput,
} from './tool-output';

// Permission
export {
  buildDefaultPermissionRules,
  createPermissionDeniedOutput,
  evaluatePermissionDecision,
  isPermissionDeniedOutput,
  isPermissionRule,
  resolveToolPermissionTargets,
  wrapToolWithPermission,
  wrapToolsWithPermission,
  type PermissionAuditEvent,
  type PermissionCheck,
  type PermissionCheckInput,
  type PermissionCheckResult,
  type PermissionDecision,
  type PermissionDecisionInfo,
  type PermissionDeniedOutput,
  type PermissionDomain,
  type PermissionRule,
  type PermissionTargets,
} from './permission';

export { parseJsonc, updateJsoncValue, type JsoncParseResult } from './jsonc';
