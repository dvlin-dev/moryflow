/**
 * [DEFINES]: Chat IPC 类型（上下文/会话/消息）
 * [USED_BY]: main/chat handlers, renderer chat-pane
 * [POS]: PC IPC chat 类型入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { ModelThinkingProfile, TaskState } from '@moryflow/agents-runtime';

export type AgentChatContext = {
  /**
   * 当前聚焦的文件路径（相对 Vault）。
   */
  filePath?: string;
  /**
   * 用户在编辑器中选中的文字。
   */
  selectedText?: string;
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
  /** 会话归属的 workspace profile key（用于同一工作区多账号隔离） */
  profileKey?: string | null;
  preferredModelId?: string;
  /** 会话级思考策略（用于多入口统一 Agent 参数） */
  thinking?: AgentThinkingSelection;
  /** 会话级思考档案（用于多入口统一规则校验） */
  thinkingProfile?: AgentThinkingProfile;
  /** 会话累积的 token 使用量 */
  tokenUsage?: TokenUsage;
  /** 当前会话的轻量 task snapshot */
  taskState?: TaskState;
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
