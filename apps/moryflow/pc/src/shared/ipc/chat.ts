/**
 * [DEFINES]: Chat IPC 类型（上下文/会话/消息）
 * [USED_BY]: main/chat handlers, renderer chat-pane
 * [POS]: PC IPC chat 类型入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

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
};

export type AgentAccessMode = 'agent' | 'full_access';

export type ChatSessionSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  preferredModelId?: string;
  /** 会话累积的 token 使用量 */
  tokenUsage?: TokenUsage;
  /** 会话级访问模式 */
  mode?: AgentAccessMode;
};

export type ChatSessionEvent =
  | { type: 'created'; session: ChatSessionSummary }
  | { type: 'updated'; session: ChatSessionSummary }
  | { type: 'deleted'; sessionId: string };

export type UIMessage = import('ai').UIMessage;
export type UIMessageChunk = import('ai').UIMessageChunk;
