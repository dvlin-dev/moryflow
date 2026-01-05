/**
 * Chat 工具函数
 */

import type { UIMessage } from 'ai'

/**
 * 从 UIMessage parts 中提取纯文本内容
 */
export function extractTextFromParts(parts: UIMessage['parts'] | undefined): string {
  if (!parts || !Array.isArray(parts)) {
    return ''
  }
  return parts
    .filter((part): part is { type: 'text'; text: string } => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
}
