/**
 * [DEFINES]: MessageAttachment - 消息附件类型系统
 * [USED_BY]: ChatPromptInput, MessageAttachments, ChatMessage
 * [POS]: 结构化附件定义，区分引用（Reference）与嵌入（Embed）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

/** 附件基础接口 */
interface BaseAttachment {
  id: string
}

/**
 * 文件引用附件
 * - 场景：@ 搜索选择的工作区文件
 * - 行为：只传路径，AI 通过工具自行读取
 * - 发送：拼接到文本 [Referenced files: path1, path2]
 */
export interface FileRefAttachment extends BaseAttachment {
  type: 'file-ref'
  /** 文件完整路径 */
  path: string
  /** 文件名 */
  name: string
  /** 扩展名（用于图标显示） */
  extension: string
}

/**
 * 文件嵌入附件
 * - 场景：上传的文本文件（如 .txt, .md, .json）
 * - 行为：内容直接传给 AI
 * - 发送：放入 message.files
 *
 * TODO: 暂未实现，预留扩展
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

/**
 * 图片附件
 * - 场景：上传图片、粘贴图片、截图
 * - 行为：先上传到 OSS，再将 URL 传给 AI
 * - 发送：放入 message.files
 *
 * TODO: 暂未实现，预留扩展
 */
export interface ImageAttachment extends BaseAttachment {
  type: 'image'
  /** OSS 图片 URL */
  url: string
  /** image/png, image/jpeg 等 */
  mediaType: string
  /** 图片描述 */
  alt?: string
  /** 原始文件名 */
  filename?: string
}

/** 联合附件类型 */
export type MessageAttachment =
  | FileRefAttachment
  | FileEmbedAttachment
  | ImageAttachment

/** 附件类型字面量 */
export type AttachmentType = MessageAttachment['type']

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
 * @param path 文件路径或文件名
 * @returns 小写扩展名，无扩展名返回空字符串
 */
export const getFileExtension = (path: string): string => {
  const lastDot = path.lastIndexOf('.')
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))

  // 没有点号，或点号在最后一个斜杠之前（说明是目录名带点）
  if (lastDot === -1 || lastDot < lastSlash) {
    return ''
  }

  return path.slice(lastDot + 1).toLowerCase()
}

/**
 * 创建文件引用附件
 * @param file 文件信息
 * @returns FileRefAttachment
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
