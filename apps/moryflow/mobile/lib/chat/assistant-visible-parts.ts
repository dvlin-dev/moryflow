/**
 * [PROVIDES]: filterVisibleAssistantParts - 按 orderedPart 索引过滤 assistant message parts
 * [DEPENDS]: ai.isFileUIPart, UIMessage
 * [POS]: Mobile Chat assistant part 可见性纯函数，供 MessageBubble 消费
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { isFileUIPart, type UIMessage } from 'ai';

export function filterVisibleAssistantParts(
  parts: UIMessage['parts'] | undefined,
  hiddenOrderedPartIndexes?: ReadonlySet<number>
): UIMessage['parts'] {
  if (
    !parts ||
    parts.length === 0 ||
    !hiddenOrderedPartIndexes ||
    hiddenOrderedPartIndexes.size === 0
  ) {
    return parts ?? [];
  }

  let orderedPartIndex = 0;

  return parts.filter((part) => {
    if (isFileUIPart(part)) {
      return true;
    }

    const hidden = hiddenOrderedPartIndexes.has(orderedPartIndex);
    orderedPartIndex += 1;
    return !hidden;
  });
}
