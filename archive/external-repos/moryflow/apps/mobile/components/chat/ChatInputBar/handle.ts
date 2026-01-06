/**
 * [PROVIDES]: buildAIRequestText, cleanFileRefMarker
 * [DEPENDS]: attachment types
 * [POS]: 附件处理：构建 AI 请求文本、清理消息标记
 */

import type { FileRefAttachment } from './types'

// ============================================
// 常量
// ============================================

/** 文件引用正则：匹配消息末尾的 [Referenced files: ...] */
const FILE_REF_REGEX = /\n\n\[Referenced files: [^\]]+\]$/

// ============================================
// AI 请求构建
// ============================================

/**
 * 构建 AI 请求文本
 * 将文件引用附件的路径拼接到消息末尾
 */
export function buildAIRequestText(
  content: string,
  attachments: FileRefAttachment[] = []
): string {
  if (attachments.length === 0) return content

  const paths = attachments.map((f) => f.path).join(', ')
  return `${content}\n\n[Referenced files: ${paths}]`
}

// ============================================
// 消息文本清理
// ============================================

/**
 * 移除消息文本中的文件引用标记
 * 附件信息从 metadata 读取，无需从文本解析
 */
export function cleanFileRefMarker(text: string): string {
  return text.replace(FILE_REF_REGEX, '')
}
