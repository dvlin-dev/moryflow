/**
 * [DEFINES]: Chat IPC 类型（上下文/会话/消息）
 * [USED_BY]: main/chat handlers, renderer chat-pane
 * [POS]: PC IPC chat 类型入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ModelThinkingProfile } from '@moryflow/agents-runtime';

export type AgentChatContext = {
  /**
   * 当前聚焦的文件路径（相对 Vault）。
   */
  filePath?: string;
  /**
   * 额外的上下文摘要，例如"重点关注 TODO 段落"。
   */
  summary?: string;
};

export type AgentSelectedSkill = {
  /**
   * 选中的 skill 名称（kebab-case）。
   */
  name: string;
};

export type AgentThinkingSelection = { mode: 'off' } | { mode: 'level'; level: string };

export type AgentThinkingProfile = ModelThinkingProfile;

/**
 * Token 使用量信息
 */
export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AgentChatRequestOptions = {
  context?: AgentChatContext;
  /**
   * 期望使用的模型 ID，若为空则使用默认配置。
   */
  preferredModelId?: string;
  /**
   * 本轮显式思考等级选择。
   */
  thinking?: AgentThinkingSelection;
  /**
   * 本轮模型思考档案（用于主进程/运行时按同一 profile 校验）。
   */
  thinkingProfile?: AgentThinkingProfile;
  /**
   * 输入框显式选中的 skill（可选）。
   */
  selectedSkill?: AgentSelectedSkill;
};

export type AgentAccessMode = 'agent' | 'full_access';

export type ChatSessionSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** 会话归属的 Vault 路径（用于当前 workspace 搜索过滤） */
  vaultPath: string;
  preferredModelId?: string;
  /** 会话累积的 token 使用量 */
  tokenUsage?: TokenUsage;
  /** 会话级访问模式 */
  mode: AgentAccessMode;
};

export type ChatSessionEvent =
  | { type: 'created'; session: ChatSessionSummary }
  | { type: 'updated'; session: ChatSessionSummary }
  | { type: 'deleted'; sessionId: string };

export type UIMessage = import('ai').UIMessage;
export type UIMessageChunk = import('ai').UIMessageChunk;
