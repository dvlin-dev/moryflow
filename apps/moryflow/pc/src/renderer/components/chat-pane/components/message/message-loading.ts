/**
 * [PROVIDES]: shouldShowAssistantLoadingPlaceholder - assistant loading 占位判定
 * [DEPENDS]: ai - ChatStatus/UIMessage
 * [POS]: ChatMessage 渲染前判定，避免空 assistant 在非运行态被误渲染为 loading
 * [UPDATE]: 2026-03-01 - assistant 仅含 file part 时不再被判定为空消息隐藏；loading 只在运行态占位显示
 * [UPDATE]: 2026-03-01 - 新增运行态约束，仅最后一条流式 assistant 允许显示 loading
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ChatStatus, UIMessage } from 'ai';

const isRunningStatus = (status: ChatStatus): boolean =>
  status === 'submitted' || status === 'streaming';

const isAssistantPlaceholder = (message: UIMessage): boolean =>
  message.role === 'assistant' && (!Array.isArray(message.parts) || message.parts.length === 0);

export const shouldShowAssistantLoadingPlaceholder = ({
  message,
  status,
  isLastMessage,
}: {
  message: UIMessage;
  status: ChatStatus;
  isLastMessage: boolean;
}): boolean => {
  if (!isLastMessage) {
    return false;
  }
  if (!isRunningStatus(status)) {
    return false;
  }
  return isAssistantPlaceholder(message);
};

export const shouldRenderAssistantMessage = ({
  message,
  status,
  isLastMessage,
  hasOrderedParts,
  hasFileParts,
}: {
  message: UIMessage;
  status: ChatStatus;
  isLastMessage: boolean;
  hasOrderedParts: boolean;
  hasFileParts: boolean;
}): boolean => {
  if (message.role !== 'assistant') {
    return true;
  }
  if (hasOrderedParts || hasFileParts) {
    return true;
  }
  return shouldShowAssistantLoadingPlaceholder({ message, status, isLastMessage });
};
