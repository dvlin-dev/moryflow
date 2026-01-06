/**
 * [DEFINES]: MoryflowMessageMeta - 消息元数据类型
 * [USED_BY]: ChatMessage, ChatPromptInput
 * [POS]: 扩展 AI SDK 的 UIMessage，存储附件等自定义数据
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { UIMessage } from 'ai'

import type { MessageAttachment } from './attachment'

/**
 * Moryflow 扩展的消息元数据
 * 存储在 UIMessage.metadata.moryflow 中
 */
export interface MoryflowMessageMeta {
  /** 用户添加的附件列表 */
  attachments?: MessageAttachment[]
}

/**
 * 带 moryflow 扩展的消息元数据类型
 */
export interface MoryflowMetadata {
  moryflow?: MoryflowMessageMeta
  [key: string]: unknown
}

/**
 * 从 UIMessage 中提取 moryflow 元数据
 */
export const getMessageMeta = (message: UIMessage): MoryflowMessageMeta => {
  const meta = message.metadata as MoryflowMetadata | undefined
  return meta?.moryflow ?? {}
}

/**
 * 创建包含 moryflow 元数据的 metadata 对象
 */
export const createMessageMetadata = (
  moryflowMeta: MoryflowMessageMeta,
  existing?: Record<string, unknown>
): MoryflowMetadata => ({
  ...existing,
  moryflow: moryflowMeta,
})
