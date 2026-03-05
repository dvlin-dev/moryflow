/**
 * [DEFINES]: Chat IPC 类型（上下文/会话/消息）
 * [USED_BY]: main/chat handlers, renderer chat-pane
 * [POS]: PC IPC chat 类型入口
 * [UPDATE]: 2026-03-03 - 新增 ChatApprovalContext（审批上下文：首次升级提示）
 * [UPDATE]: 2026-03-03 - 新增 ChatApprovalPromptConsumeResult（首次提示消费结果）
 * [UPDATE]: 2026-03-03 - 新增 ChatApproveToolResult（审批幂等结果）
 * [UPDATE]: 2026-03-04 - 新增 ChatMessageEvent（会话正文事件：snapshot/deleted）
 * [UPDATE]: 2026-03-05 - ChatMessageEvent / getSessionMessages 增加 revision（防止初始加载覆盖实时事件）
 * [UPDATE]: 2026-03-04 - ChatSessionSummary 新增 thinking/thinkingProfile（会话级 Agent 参数事实源）
 * [UPDATE]: 2026-03-05 - 新增 ChatToolApprovalAction（once/allow_type/deny）
 * [UPDATE]: 2026-03-05 - 新增全局权限模式契约（chat:permission:*），移除会话级 mode 字段
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

export type AgentAccessMode = 'ask' | 'full_access';
export type ChatGlobalPermissionMode = AgentAccessMode;

export type ChatSessionSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** 会话归属的 Vault 路径（用于当前 workspace 搜索过滤） */
  vaultPath: string;
  preferredModelId?: string;
  /** 会话级思考策略（用于多入口统一 Agent 参数） */
  thinking?: AgentThinkingSelection;
  /** 会话级思考档案（用于多入口统一规则校验） */
  thinkingProfile?: AgentThinkingProfile;
  /** 会话累积的 token 使用量 */
  tokenUsage?: TokenUsage;
};

export type ChatSessionEvent =
  | { type: 'created'; session: ChatSessionSummary }
  | { type: 'updated'; session: ChatSessionSummary }
  | { type: 'deleted'; sessionId: string };

export type ChatSessionMessagesSnapshot = {
  sessionId: string;
  messages: UIMessage[];
  /**
   * 当前会话正文快照版本（单进程内单调递增）。
   * 渲染层应忽略小于等于已应用 revision 的消息，避免回滚。
   */
  revision: number;
};

export type ChatMessageEvent =
  | {
      type: 'snapshot';
      sessionId: string;
      messages: UIMessage[];
      persisted: boolean;
      revision: number;
    }
  | {
      type: 'deleted';
      sessionId: string;
      revision: number;
    };

export type ChatApprovalContext = {
  suggestFullAccessUpgrade: boolean;
};

export type ChatApprovalPromptConsumeResult = {
  consumed: boolean;
};

export type ChatToolApprovalAction = 'once' | 'allow_type' | 'deny';

export type ChatGlobalPermissionModeEvent = {
  mode: ChatGlobalPermissionMode;
};

export type ChatApproveToolResult =
  | {
      status: 'approved';
      remember: 'once' | 'always';
    }
  | {
      status: 'denied';
    }
  | {
      status: 'already_processed';
      reason: 'missing' | 'expired' | 'processing';
    };

export type UIMessage = import('ai').UIMessage;
export type UIMessageChunk = import('ai').UIMessageChunk;
