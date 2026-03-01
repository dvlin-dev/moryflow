/**
 * [PROVIDES]: sanitizePersistedUiMessages - 持久化前 UI 消息清洗
 * [DEPENDS]: ai - UIMessage
 * [POS]: Chat 持久化边界，过滤无内容 assistant 占位消息
 * [UPDATE]: 2026-03-01 - 新增持久化清洗，避免 abort/异常后空 assistant 残留导致刷新后假 loading
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { UIMessage } from 'ai';

const hasRenderableParts = (message: UIMessage): boolean =>
  Array.isArray(message.parts) && message.parts.length > 0;

export const sanitizePersistedUiMessages = (messages: UIMessage[]): UIMessage[] => {
  return messages.filter((message) => {
    if (message.role !== 'assistant') {
      return true;
    }
    return hasRenderableParts(message);
  });
};
