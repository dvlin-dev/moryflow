/**
 * [DEFINES]: 共享索引资格判定纯函数与返回结构
 * [USED_BY]: Moryflow server / Anyhunt server / 共享测试
 * [POS]: 文件内容进入知识索引链路前的公共 gatekeeper
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新：
 * - packages/api/src/file-index/index.ts
 * - packages/api/src/index.ts
 */

import { extractRetrievableTextBlocks, normalizeIndexableText } from './structured-blocks';

export interface IndexableTextClassification {
  indexable: boolean;
  normalizedText: string | null;
  reason: 'no_indexable_text' | null;
}

export function classifyIndexableText(input: string): IndexableTextClassification {
  const normalizedText = normalizeIndexableText(input);

  if (normalizedText.length === 0) {
    return {
      indexable: false,
      normalizedText: null,
      reason: 'no_indexable_text',
    };
  }

  if (extractRetrievableTextBlocks(normalizedText).length === 0) {
    return {
      indexable: false,
      normalizedText: null,
      reason: 'no_indexable_text',
    };
  }

  return {
    indexable: true,
    normalizedText,
    reason: null,
  };
}
