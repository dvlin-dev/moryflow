/**
 * Chat 工具函数
 */

import type { UIMessage } from 'ai';
import type { AgentImageContent } from '@moryflow/agents-runtime';

/**
 * 从 UIMessage parts 中提取纯文本内容
 */
export function extractTextFromParts(parts: UIMessage['parts'] | undefined): string {
  if (!parts || !Array.isArray(parts)) {
    return '';
  }
  return parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        part?.type === 'text' && typeof part.text === 'string'
    )
    .map((part) => part.text)
    .join('\n');
}

/**
 * 从 UIMessage parts 中提取图片内容
 */
export function extractImagesFromParts(parts: UIMessage['parts'] | undefined): AgentImageContent[] {
  if (!parts || !Array.isArray(parts)) return [];
  return parts
    .filter(
      (part): part is { type: 'file'; url: string; mediaType: string; filename?: string } =>
        part?.type === 'file' &&
        typeof (part as any).url === 'string' &&
        typeof (part as any).mediaType === 'string' &&
        (part as any).mediaType.startsWith('image/')
    )
    .map((part) => ({ url: part.url, mediaType: part.mediaType, filename: part.filename }));
}
