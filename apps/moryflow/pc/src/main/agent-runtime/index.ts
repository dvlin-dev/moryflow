/**
 * [PROVIDES]: createAgentRuntime - PC 端 Agent Runtime 稳定入口
 * [DEPENDS]: runtime/runtime-factory, session/chat-session, runtime/runtime-vault-context
 * [POS]: PC 主进程 agent-runtime composition root 出口
 */

export { createAgentRuntime } from './runtime/runtime-factory.js';
export type {
  AgentRuntime,
  AgentRuntimeOptions,
  AgentStreamResult,
  ChatTurnResult,
} from './runtime/runtime-types.js';
export { createChatSession } from './session/chat-session.js';
export { runWithRuntimeVaultRoot } from './runtime/runtime-vault-context.js';
export type {
  AgentAttachmentContext,
  AgentImageContent,
  AgentContext,
} from '@moryflow/agents-runtime';
