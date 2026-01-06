/**
 * [DEFINES]: MoryflowMessageMeta, getMessageMeta, createMessageMetadata
 * [USED_BY]: ChatInputBar, MessageBubble
 * [POS]: 消息元数据类型和工具函数，与 PC 端保持一致
 */

import type { UIMessage } from 'ai'
import type { MessageAttachment } from './attachment'

/**
 * Moryflow 消息元数据
 * 存储在 UIMessage.metadata.moryflow 中
 */
export interface MoryflowMessageMeta {
  /** 用户添加的附件列表 */
  attachments?: MessageAttachment[]
}

/**
 * 从 UIMessage 中提取 moryflow 元数据
 */
export function getMessageMeta(message: UIMessage): MoryflowMessageMeta {
  const metadata = message.metadata as Record<string, unknown> | undefined
  return (metadata?.moryflow as MoryflowMessageMeta) ?? {}
}

/**
 * 创建包含 moryflow 元数据的 metadata 对象
 */
export function createMessageMetadata(
  meta: MoryflowMessageMeta
): Record<string, unknown> {
  return { moryflow: meta }
}
