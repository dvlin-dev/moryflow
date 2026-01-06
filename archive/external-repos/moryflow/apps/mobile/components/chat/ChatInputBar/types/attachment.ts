/**
 * [DEFINES]: 消息附件类型体系
 * [USED_BY]: ChatInputBar, MessageAttachments, MessageBubble
 * [POS]: 结构化附件系统，与 PC 端保持一致
 */

// ============================================
// 基础接口
// ============================================

interface BaseAttachment {
  id: string
}

// ============================================
// 文件引用附件（已实现）
// ============================================

/**
 * 文件引用 - 只传路径，AI 自行读取
 */
export interface FileRefAttachment extends BaseAttachment {
  type: 'file-ref'
  /** 文件完整路径 */
  path: string
  /** 文件名 */
  name: string
  /** 扩展名（用于图标） */
  extension: string
}

// ============================================
// 文件嵌入附件（预留）
// ============================================

/**
 * 文件嵌入 - 内容直传 AI
 */
export interface FileEmbedAttachment extends BaseAttachment {
  type: 'file-embed'
  name: string
  /** MIME 类型 */
  mediaType: string
  /** 文本内容或 base64 */
  content: string
  /** 文件大小（字节） */
  size?: number
}

// ============================================
// 图片附件（预留）
// ============================================

/**
 * 图片 - 先传 OSS 再发 URL
 */
export interface ImageAttachment extends BaseAttachment {
  type: 'image'
  /** OSS URL */
  url: string
  /** image/png, image/jpeg 等 */
  mediaType: string
  /** 可选描述 */
  alt?: string
  /** 文件名 */
  filename?: string
}

// ============================================
// 联合类型
// ============================================

/** 所有附件类型的联合 */
export type MessageAttachment =
  | FileRefAttachment
  | FileEmbedAttachment
  | ImageAttachment

/** 当前已实现的附件类型 */
export type ImplementedAttachment = FileRefAttachment

// ============================================
// 类型守卫
// ============================================

export const isFileRef = (a: MessageAttachment): a is FileRefAttachment =>
  a.type === 'file-ref'

export const isFileEmbed = (a: MessageAttachment): a is FileEmbedAttachment =>
  a.type === 'file-embed'

export const isImage = (a: MessageAttachment): a is ImageAttachment =>
  a.type === 'image'

// ============================================
// 工具函数
// ============================================

/**
 * 从文件路径提取扩展名
 */
const getFileExtension = (path: string): string => {
  const lastDot = path.lastIndexOf('.')
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (lastDot === -1 || lastDot < lastSlash) return ''
  return path.slice(lastDot + 1).toLowerCase()
}

/**
 * 创建文件引用附件
 */
export const createFileRefAttachment = (file: {
  id: string
  path: string
  name: string
}): FileRefAttachment => ({
  id: file.id,
  type: 'file-ref',
  path: file.path,
  name: file.name,
  extension: getFileExtension(file.path),
})
