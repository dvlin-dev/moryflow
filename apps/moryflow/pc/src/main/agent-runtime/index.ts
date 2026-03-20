/**
 * [PROVIDES]: createAgentRuntime/createChatSession/runWithRuntimeVaultRoot 统一导出
 * [DEPENDS]: runtime/runtime-factory, session/chat-session, runtime/runtime-vault-context
 * [POS]: agent-runtime 根入口，仅负责稳定导出面，不承载运行时实现细节
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export { createAgentRuntime } from './runtime/runtime-factory.js';
export { createChatSession } from './session/chat-session.js';
export { runWithRuntimeVaultRoot } from './runtime/runtime-vault-context.js';
export type {
  AgentRuntime,
  AgentRuntimeOptions,
  AgentStreamResult,
  ChatTurnResult,
} from './runtime/runtime-types.js';
export type {
  AgentAttachmentContext,
  AgentContext,
  AgentImageContent,
} from '@moryflow/agents-runtime';
