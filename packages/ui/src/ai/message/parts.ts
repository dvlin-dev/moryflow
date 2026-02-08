/**
 * [PROVIDES]: splitMessageParts/cleanFileRefMarker - UIMessage parts 解析工具
 * [DEPENDS]: ai（UIMessage + type guards）
 * [POS]: 共享“消息渲染前”的纯函数，避免 PC/Web 各自实现 parts 拆分与尾部标记清理导致语义漂移
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { isFileUIPart, isTextUIPart } from 'ai';
import type { FileUIPart, UIMessage } from 'ai';

/** 移除消息文本末尾的文件引用标记 */
const FILE_REF_REGEX = /\n\n\[Referenced files: [^\]]+\]$/;

export const cleanFileRefMarker = (text: string): string => text.replace(FILE_REF_REGEX, '');

export type SplitMessageParts = {
  fileParts: FileUIPart[];
  orderedParts: UIMessage['parts'][number][];
  messageText: string;
};

export const splitMessageParts = (parts: UIMessage['parts'] | undefined): SplitMessageParts => {
  const fileParts: FileUIPart[] = [];
  const orderedParts: UIMessage['parts'][number][] = [];
  const textParts: string[] = [];

  if (!parts || parts.length === 0) {
    return { fileParts, orderedParts, messageText: '' };
  }

  for (const part of parts) {
    if (isFileUIPart(part)) {
      fileParts.push(part);
      continue;
    }
    orderedParts.push(part);
    if (isTextUIPart(part)) {
      textParts.push(part.text ?? '');
    }
  }

  return { fileParts, orderedParts, messageText: textParts.join('\n') };
};
