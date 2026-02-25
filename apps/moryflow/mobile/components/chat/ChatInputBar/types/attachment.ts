/**
 * [DEFINES]: MessageAttachment - 消息附件类型体系（统一 ChatAttachment）
 * [USED_BY]: ChatInputBar, MessageAttachments, MessageBubble
 * [POS]: 结构化附件系统，与 PC 端保持一致
 */

import type { ChatAttachment } from '@moryflow/types';

/** 所有附件类型的联合（统一为 @moryflow/types） */
export type MessageAttachment = ChatAttachment;

export type FileRefAttachment = Extract<ChatAttachment, { type: 'file-ref' }>;
export type FileEmbedAttachment = Extract<ChatAttachment, { type: 'file-embed' }>;
export type ImageAttachment = Extract<ChatAttachment, { type: 'image' }>;

/** 当前已实现的附件类型 */
export type ImplementedAttachment = FileRefAttachment;

// ============================================
// 类型守卫
// ============================================

export const isFileRef = (a: MessageAttachment): a is FileRefAttachment => a.type === 'file-ref';

export const isFileEmbed = (a: MessageAttachment): a is FileEmbedAttachment =>
  a.type === 'file-embed';

export const isImage = (a: MessageAttachment): a is ImageAttachment => a.type === 'image';

// ============================================
// 工具函数
// ============================================

/**
 * 从文件路径提取扩展名
 */
const getFileExtension = (path: string): string => {
  const lastDot = path.lastIndexOf('.');
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  if (lastDot === -1 || lastDot < lastSlash) return '';
  return path.slice(lastDot + 1).toLowerCase();
};

/**
 * 创建文件引用附件
 */
export const createFileRefAttachment = (file: {
  id: string;
  path: string;
  name: string;
}): FileRefAttachment => ({
  id: file.id,
  type: 'file-ref',
  path: file.path,
  name: file.name,
  extension: getFileExtension(file.path),
});
