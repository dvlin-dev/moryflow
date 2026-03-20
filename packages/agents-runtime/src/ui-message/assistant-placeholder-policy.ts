/**
 * [PROVIDES]: assistant 占位消息可见性策略（loading 占位显示、streaming tail、空消息隐藏、最后可见 assistant 计算）
 * [DEPENDS]: ai.ChatStatus/UIMessage, visibility-policy.isToolFinishedState
 * [POS]: 跨端消息流占位渲染共享事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { ChatStatus, UIMessage } from 'ai';
import { isReasoningUIPart, isToolUIPart } from 'ai';

import { isToolFinishedState } from './visibility-policy';

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

/**
 * Streaming tail: shows a loading indicator after the last visible part
 * when the AI is still streaming but the last part has finished producing content.
 * Covers the "dead zone" between tool completion and the next part arriving,
 * including file-only messages where orderedParts is empty but message.parts is not.
 */
export function shouldShowStreamingTail({
  status,
  isLastMessage,
  lastOrderedPart,
  hasMessageParts,
}: {
  status: ChatStatus;
  isLastMessage: boolean;
  lastOrderedPart: UIMessage['parts'][number] | undefined;
  /** Whether the original message.parts array is non-empty (includes file parts). */
  hasMessageParts: boolean;
}): boolean {
  if (!isLastMessage || !isRunningChatStatus(status)) {
    return false;
  }
  // File-only message during streaming — no other indicator covers this gap.
  if (!lastOrderedPart) {
    return hasMessageParts;
  }
  if (isToolUIPart(lastOrderedPart)) {
    return isToolFinishedState(lastOrderedPart.state);
  }
  if (isReasoningUIPart(lastOrderedPart)) {
    return lastOrderedPart.state !== 'streaming';
  }
  return false;
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
