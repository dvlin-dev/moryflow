/**
 * [DEFINES]: ChatMessageMeta, getMessageMeta, createMessageMetadata
 * [USED_BY]: ChatInputBar, MessageBubble
 * [POS]: 消息元数据类型和工具函数，与 PC 端保持一致
 */

import type { UIMessage } from 'ai';
import type { ChatMessageMeta, ChatMessageMetadata } from '@moryflow/types';

/**
 * 从 UIMessage 中提取 chat 元数据
 */
export function getMessageMeta(message: UIMessage): ChatMessageMeta {
  const metadata = message.metadata as ChatMessageMetadata | undefined;
  return metadata?.chat ?? {};
}

/**
 * 创建包含 chat 元数据的 metadata 对象
 */
export function createMessageMetadata(meta: ChatMessageMeta): ChatMessageMetadata {
  return { chat: meta };
}
