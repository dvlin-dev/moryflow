/**
 * [PROVIDES]: assistant 占位消息可见性策略（loading 占位显示、空消息隐藏、最后可见 assistant 计算）
 * [DEPENDS]: ai.ChatStatus/UIMessage
 * [POS]: 跨端消息流占位渲染共享事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ChatStatus, UIMessage } from 'ai';

export const isRunningChatStatus = (status: ChatStatus): boolean =>
  status === 'submitted' || status === 'streaming';

const isAssistantPlaceholder = (message: UIMessage): boolean =>
  message.role === 'assistant' && (!Array.isArray(message.parts) || message.parts.length === 0);

const hasRenderableMessageParts = (message: UIMessage): boolean =>
  Array.isArray(message.parts) && message.parts.length > 0;

export function shouldShowAssistantLoadingPlaceholder({
  message,
  status,
  isLastMessage,
}: {
  message: UIMessage;
  status: ChatStatus;
  isLastMessage: boolean;
}): boolean {
  if (!isLastMessage) {
    return false;
  }
  if (!isRunningChatStatus(status)) {
    return false;
  }
  return isAssistantPlaceholder(message);
}

export function shouldRenderAssistantMessage({
  message,
  status,
  isLastMessage,
}: {
  message: UIMessage;
  status: ChatStatus;
  isLastMessage: boolean;
}): boolean {
  if (message.role !== 'assistant') {
    return true;
  }
  if (hasRenderableMessageParts(message)) {
    return true;
  }
  return shouldShowAssistantLoadingPlaceholder({ message, status, isLastMessage });
}

export function resolveLastVisibleAssistantIndex({
  messages,
  status,
}: {
  messages: UIMessage[];
  status: ChatStatus;
}): number {
  let lastVisibleAssistantIndex = -1;

  messages.forEach((message, index) => {
    if (message.role !== 'assistant') {
      return;
    }

    const isLastMessage = index === messages.length - 1;
    if (shouldRenderAssistantMessage({ message, status, isLastMessage })) {
      lastVisibleAssistantIndex = index;
    }
  });

  return lastVisibleAssistantIndex;
}
