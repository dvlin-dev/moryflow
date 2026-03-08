/**
 * [PROVIDES]: sanitizePersistedUiMessages - 持久化前 UI 消息清洗
 * [DEPENDS]: ai - UIMessage
 * [POS]: Chat 持久化边界，过滤无内容 assistant 占位消息
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
