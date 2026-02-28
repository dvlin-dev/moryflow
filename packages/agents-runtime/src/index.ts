/**
 * [PROVIDES]: createAgentFactory/createModelFactory/createVaultUtils/ContextWindow/ToolOutputTruncation/Compaction/DoomLoop/RuntimeConfig/Hooks/AgentMarkdown - Agent 运行时核心
 * [DEPENDS]: @openai/agents-core, @openai/agents-extensions - 底层 Agent 框架
 * [POS]: 平台无关的运行时抽象，被 pc/main 和 mobile 的 agent-runtime 依赖
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// 类型导出
export * from './types';

// 核心模块
export { createAgentFactory, type AgentFactory } from './agent-factory';
export { bindDefaultModelProvider } from './default-model-provider';
export { normalizeFunctionToolSchema, normalizeToolSchemasForInterop } from './tool-schema-compat';
export {
  createModelFactory,
  type ModelFactory,
  type BuildModelOptions,
  type BuildModelResult,
} from './model-factory';
export {
  buildReasoningProviderOptions,
  supportsThinkingForSdkType,
  resolveReasoningConfigFromThinkingSelection,
} from './reasoning-config';
export {
  buildThinkingProfile,
  createDefaultThinkingProfile,
  resolveDefaultThinkingLevel,
  isThinkingLevelEnabled,
  toThinkingSelection,
  type RawThinkingProfileInput,
} from './thinking-profile';
export {
  resolveThinkingToReasoning,
  resolveThinkingSelectionForProfile,
  type ThinkingDowngradeReason,
  type ResolvedThinkingResult,
} from './thinking-adapter';
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

// 上下文窗口解析
export {
  resolveContextWindow,
  type ProviderModelContextSource,
  type ResolveContextWindowInput,
} from './context-window';

// Compaction
export {
  compactHistory,
  generateCompactionSummary,
  DEFAULT_COMPACTION_CONFIG,
  type CompactionConfig,
  type CompactionResult,
  type CompactionStats,
} from './compaction';
export {
  createCompactionPreflightGate,
  type CompactionPreflightGateOptions,
} from './compaction-preflight';

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
export { type ModeSwitchAuditEvent } from './mode-audit';

export { parseJsonc, updateJsoncValue, type JsoncParseResult } from './jsonc';
export {
  isRunItemStreamEvent,
  isRunRawModelStreamEvent,
  resolveToolCallIdFromRawItem,
  mapRunToolEventToChunk,
  extractRunRawModelStreamEvent,
  createRunModelStreamNormalizer,
  type RunItemStreamEventLike,
  type RunRawModelStreamEventLike,
  type UiStreamUsage,
  type CanonicalRawEventKind,
  type CanonicalRawEventSource,
  type ExtractedRunModelStreamEvent,
  type RunModelStreamNormalizer,
} from './ui-stream';

// Runtime Config / Hooks / Agent Markdown
export {
  parseRuntimeConfig,
  mergeRuntimeConfig,
  type AgentRuntimeConfig,
  type RuntimeConfigParseResult,
} from './runtime-config';
export {
  applyChatParamsHook,
  applyChatSystemHook,
  sanitizeHooksConfig,
  sanitizeModelSettings,
  wrapToolWithHooks,
  wrapToolsWithHooks,
  type ChatParamsHook,
  type ChatSystemHook,
  type RuntimeHooksConfig,
  type ToolHookRule,
} from './hooks';
export { parseAgentMarkdown, type AgentMarkdownDefinition } from './agent-markdown';

// Doom Loop
export {
  createDoomLoopGuard,
  wrapToolWithDoomLoop,
  wrapToolsWithDoomLoop,
  DEFAULT_DOOM_LOOP_CONFIG,
  DoomLoopError,
  type DoomLoopAction,
  type DoomLoopApprovalInfo,
  type DoomLoopCheckInput,
  type DoomLoopConfig,
  type DoomLoopDecision,
  type DoomLoopGuard,
  type DoomLoopReason,
} from './doom-loop';
