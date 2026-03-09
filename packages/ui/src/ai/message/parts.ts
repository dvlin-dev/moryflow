/**
 * [PROVIDES]: splitMessageParts/cleanFileRefMarker/findLastTextPartIndex/buildVisibleOrderedPartEntries/findLastTextOrderedPartIndex - UIMessage parts 解析工具
 * [DEPENDS]: ai（UIMessage + type guards）
 * [POS]: 共享“消息渲染前”的纯函数，避免 PC/Web 各自实现 parts 拆分与尾部标记清理导致语义漂移
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import { isFileUIPart, isTextUIPart } from 'ai';
import type { FileUIPart, UIMessage } from 'ai';

/** 移除消息文本末尾的文件引用标记 */
const FILE_REF_REGEX = /\n\n\[Referenced files: [^\]]+\]$/;

export const cleanFileRefMarker = (text: string): string => text.replace(FILE_REF_REGEX, '');

// STREAMDOWN_ANIM: 仅对“最后一个 text part”启用 Streamdown token 动画，避免列表大段内容重复动画。
/** 找出 orderedParts 中最后一个 text part 的索引；不存在则返回 -1 */
export const findLastTextPartIndex = (orderedParts: UIMessage['parts'][number][]): number => {
  for (let index = orderedParts.length - 1; index >= 0; index -= 1) {
    const part = orderedParts[index];
    if (part && isTextUIPart(part)) {
      return index;
    }
  }

  return -1;
};

export type OrderedPartEntry = {
  orderedPart: UIMessage['parts'][number];
  orderedPartIndex: number;
};

export const buildVisibleOrderedPartEntries = (
  orderedParts: UIMessage['parts'][number][],
  hiddenOrderedPartIndexes?: ReadonlySet<number>
): OrderedPartEntry[] => {
  if (!hiddenOrderedPartIndexes || hiddenOrderedPartIndexes.size === 0) {
    return orderedParts.map((orderedPart, orderedPartIndex) => ({
      orderedPart,
      orderedPartIndex,
    }));
  }

  const entries: OrderedPartEntry[] = [];
  orderedParts.forEach((orderedPart, orderedPartIndex) => {
    if (hiddenOrderedPartIndexes.has(orderedPartIndex)) {
      return;
    }
    entries.push({
      orderedPart,
      orderedPartIndex,
    });
  });
  return entries;
};

export const findLastTextOrderedPartIndex = (entries: OrderedPartEntry[]): number => {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry && isTextUIPart(entry.orderedPart)) {
      return entry.orderedPartIndex;
    }
  }

  return -1;
};

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
