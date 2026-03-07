/**
 * [DEFINES]: ChatMessageProps/MessageActionHandlers
 * [USED_BY]: components/chat-pane/components/message/index.tsx
 * [POS]: ChatMessage 类型入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
  onToolApproval?: (input: { approvalId: string; action: 'once' | 'allow_type' | 'deny' }) => void;
  hiddenOrderedPartIndexes?: ReadonlySet<number>;
};

export type ParsedMessageParts = {
  attachments: FileUIPart[];
  body: string | ReactNode;
  reasoningParts: ReasoningUIPart[];
  toolParts: ToolUIPart[];
};
