/**
 * [DEFINES]: MessageAttachment - 消息附件类型系统（统一 ChatAttachment）
 * [USED_BY]: ChatPromptInput, MessageAttachments, ChatMessage
 * [POS]: 结构化附件定义，区分引用（Reference）与嵌入（Embed）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { ChatAttachment } from '@moryflow/types';

/** 联合附件类型（统一为 @moryflow/types） */
export type MessageAttachment = ChatAttachment;

export type FileRefAttachment = Extract<ChatAttachment, { type: 'file-ref' }>;
export type FileEmbedAttachment = Extract<ChatAttachment, { type: 'file-embed' }>;
export type ImageAttachment = Extract<ChatAttachment, { type: 'image' }>;

/** 附件类型字面量 */
export type AttachmentType = MessageAttachment['type'];

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
 * @param path 文件路径或文件名
 * @returns 小写扩展名，无扩展名返回空字符串
 */
export const getFileExtension = (path: string): string => {
  const lastDot = path.lastIndexOf('.');
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));

  // 没有点号，或点号在最后一个斜杠之前（说明是目录名带点）
  if (lastDot === -1 || lastDot < lastSlash) {
    return '';
  }

  return path.slice(lastDot + 1).toLowerCase();
};

/**
 * 创建文件引用附件
 * @param file 文件信息
 * @returns FileRefAttachment
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
