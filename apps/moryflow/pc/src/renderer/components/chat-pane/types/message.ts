/**
 * [DEFINES]: ChatMessageMeta helpers - 消息元数据访问
 * [USED_BY]: ChatMessage, ChatPromptInput
 * [POS]: 统一 UIMessage.metadata.chat 的访问入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { UIMessage } from 'ai';
import type { ChatMessageMeta, ChatMessageMetadata } from '@moryflow/types';

/**
 * 从 UIMessage 中提取 chat 元数据
 */
export const getMessageMeta = (message: UIMessage): ChatMessageMeta => {
  const meta = message.metadata as ChatMessageMetadata | undefined;
  return meta?.chat ?? {};
};

/**
 * 创建包含 chat 元数据的 metadata 对象
 */
export const createMessageMetadata = (
  chatMeta: ChatMessageMeta,
  existing?: Record<string, unknown>
): ChatMessageMetadata => ({
  ...existing,
  chat: chatMeta,
});
