/**
 * [PROVIDES]: buildAIRequest - 将附件转换为 AI 请求格式
 * [DEPENDS]: types/attachment
 * [POS]: 发送消息时，根据附件类型分流处理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { FileUIPart } from 'ai'

import type {
  MessageAttachment,
  FileRefAttachment,
} from '../types/attachment'
import { isFileRef, isFileEmbed, isImage } from '../types/attachment'

/** AI 请求格式 */
export interface AIRequestPayload {
  /** 处理后的文本（可能包含文件引用标记） */
  text: string
  /** 嵌入的文件列表（图片、上传文件等） */
  files: FileUIPart[]
}

/**
 * 将消息附件转换为 AI 请求格式
 *
 * - file-ref: 拼接到文本末尾 [Referenced files: path1, path2]
 * - file-embed: 转换为 FileUIPart 放入 files（TODO）
 * - image: 转换为 FileUIPart 放入 files，URL 来自 OSS（TODO）
 *
 * @param content 用户输入的纯文本
 * @param attachments 附件列表
 * @returns AI 请求 payload
 */
export const buildAIRequest = (
  content: string,
  attachments: MessageAttachment[] = []
): AIRequestPayload => {
  const fileRefs: FileRefAttachment[] = []
  const embeds: FileUIPart[] = []

  for (const att of attachments) {
    if (isFileRef(att)) {
      // 文件引用：收集路径，稍后拼接到文本
      fileRefs.push(att)
    } else if (isFileEmbed(att)) {
      // 文件嵌入：转换为 FileUIPart
      // TODO: 实现文件上传后启用
      embeds.push({
        type: 'file',
        filename: att.name,
        mediaType: att.mediaType,
        url: `data:${att.mediaType};base64,${att.content}`,
      })
    } else if (isImage(att)) {
      // 图片：转换为 FileUIPart，URL 来自 OSS
      // TODO: 实现图片上传后启用
      embeds.push({
        type: 'file',
        filename: att.filename ?? att.alt ?? 'image',
        mediaType: att.mediaType,
        url: att.url,
      })
    }
  }

  // 拼接文件引用到文本
  let text = content
  if (fileRefs.length > 0) {
    const paths = fileRefs.map((f) => f.path).join(', ')
    text = `${content}\n\n[Referenced files: ${paths}]`
  }

  return { text, files: embeds }
}
