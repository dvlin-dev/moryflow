/**
 * [PROVIDES]: resolveMessagesWithAssistantRoundMetadata - 轮次结束元数据注入纯函数
 * [DEPENDS]: @moryflow/agents-runtime/ui-message/assistant-round-collapse
 * [POS]: Mobile Chat 持久化前的 assistant round 元数据收口层
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { UIMessage } from '@ai-sdk/react';
import { annotateLatestAssistantRoundMetadata } from '@moryflow/agents-runtime/ui-message/assistant-round-collapse';

export type ChatLifecycleStatus = 'ready' | 'submitted' | 'streaming' | 'error';

const isFinishedStatus = (status: ChatLifecycleStatus): boolean =>
  status === 'ready' || status === 'error';

export function resolveMessagesWithAssistantRoundMetadata(
  messages: UIMessage[],
  status: ChatLifecycleStatus,
  finishedAt = Date.now()
): {
  messages: UIMessage[];
  changed: boolean;
} {
  if (!isFinishedStatus(status)) {
    return {
      messages,
      changed: false,
    };
  }

  const annotated = annotateLatestAssistantRoundMetadata(messages, finishedAt);
  return {
    messages: annotated.messages,
    changed: annotated.changed,
  };
}
