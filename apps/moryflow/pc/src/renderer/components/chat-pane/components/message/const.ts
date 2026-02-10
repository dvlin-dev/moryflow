/**
 * [DEFINES]: ChatMessageProps/MessageActionHandlers
 * [USED_BY]: components/chat-pane/components/message/index.tsx
 * [POS]: ChatMessage 类型入口
 * [UPDATE]: 2026-02-10 - 增加 isLastMessage，用于精确控制 Streamdown 流式动画
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ReactNode } from 'react';
import type { ChatStatus, FileUIPart, ReasoningUIPart, ToolUIPart, UIMessage } from 'ai';

export type MessageActionHandlers = {
  onResend?: (messageIndex: number) => void;
  onRetry?: () => void;
  onEditAndResend?: (messageIndex: number, newContent: string) => void;
  onFork?: (messageIndex: number) => void;
};

export type ChatMessageProps = {
  message: UIMessage;
  messageIndex: number;
  status: ChatStatus;
  /** 是否是最后一条 assistant 消息（用于显示重试按钮） */
  isLastAssistant?: boolean;
  /** 是否是列表中的最后一条消息（用于流式动画） */
  isLastMessage?: boolean;
  /** 消息操作回调 */
  actions?: MessageActionHandlers;
  onToolApproval?: (input: { approvalId: string; remember: 'once' | 'always' }) => void;
};

export type ParsedMessageParts = {
  attachments: FileUIPart[];
  body: string | ReactNode;
  reasoningParts: ReasoningUIPart[];
  toolParts: ToolUIPart[];
};
