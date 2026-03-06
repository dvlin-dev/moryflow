/**
 * [PROVIDES]: resolveAssistantRoundTimingState - 按“首个 assistant 可渲染内容出现”维护轮次 startedAt/finishedAt 纯函数
 * [DEPENDS]: @ai-sdk/react UIMessage
 * [POS]: Mobile Chat 轮次时长事实源；负责把消息列表 + 生命周期状态映射为稳定 round timestamps
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { UIMessage } from '@ai-sdk/react';

export type ChatLifecycleStatus = 'ready' | 'submitted' | 'streaming' | 'error';

export type AssistantRoundTimingState = {
  roundKey?: string;
  startedAt?: number;
  finishedAt?: number;
};

const isFinishedStatus = (status: ChatLifecycleStatus): boolean =>
  status === 'ready' || status === 'error';

const resolveLatestUserRoundKey = (messages: UIMessage[]): string | undefined => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== 'user') {
      continue;
    }
    const messageId = typeof message.id === 'string' ? message.id.trim() : '';
    return messageId || `user:${index}`;
  }
  return undefined;
};

const resolveLatestUserIndex = (messages: UIMessage[]): number => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return index;
    }
  }
  return -1;
};

const hasAssistantContentAfterUser = (messages: UIMessage[], latestUserIndex: number): boolean => {
  for (let index = latestUserIndex + 1; index < messages.length; index += 1) {
    const message = messages[index];
    if (message?.role !== 'assistant') {
      continue;
    }
    if (Array.isArray(message.parts) && message.parts.length > 0) {
      return true;
    }
  }
  return false;
};

export const isAssistantRoundTimingStateEqual = (
  left: AssistantRoundTimingState,
  right: AssistantRoundTimingState
): boolean =>
  left.roundKey === right.roundKey &&
  left.startedAt === right.startedAt &&
  left.finishedAt === right.finishedAt;

export function resolveAssistantRoundTimingState({
  previous,
  messages,
  status,
  now,
}: {
  previous: AssistantRoundTimingState;
  messages: UIMessage[];
  status: ChatLifecycleStatus;
  now: number;
}): AssistantRoundTimingState {
  const roundKey = resolveLatestUserRoundKey(messages);
  if (!roundKey) {
    return {};
  }

  const latestUserIndex = resolveLatestUserIndex(messages);
  const hasAssistantContent = hasAssistantContentAfterUser(messages, latestUserIndex);
  const nextState: AssistantRoundTimingState =
    previous.roundKey === roundKey ? { ...previous } : { roundKey };

  if (!hasAssistantContent) {
    return { roundKey };
  }

  if (nextState.startedAt === undefined) {
    nextState.startedAt = now;
  }

  if (isFinishedStatus(status)) {
    if (nextState.finishedAt === undefined) {
      nextState.finishedAt = now;
    }
  } else {
    nextState.finishedAt = undefined;
  }

  return nextState;
}
