/**
 * [PROVIDES]: Retrieval 打分、归一化与 snippet 辅助
 * [DEPENDS]: Retrieval result shapes
 * [POS]: 统一检索排序工具
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { RetrievalResult } from './retrieval.types';

export function tokenizeSearchQuery(query: string): string[] {
  return query
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function computeKeywordMatchScore(
  text: string,
  queryTokens: string[],
): number {
  if (queryTokens.length === 0) {
    return 0;
  }

  const haystack = text.toLocaleLowerCase();
  const hits = queryTokens.filter((token) => haystack.includes(token));
  return hits.length / queryTokens.length;
}

export function truncateSnippet(content: string, maxLength = 320): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function normalizeAndRankResults<T extends RetrievalResult>(
  items: T[],
  limit: number,
): T[] {
  if (items.length === 0) {
    return [];
  }

  const sorted = [...items].sort((left, right) => right.score - left.score);
  const selected = sorted.slice(0, limit);
  const scores = selected.map((item) => item.score);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const denominator = maxScore - minScore;

  return selected.map((item, index) => ({
    ...item,
    rank: index + 1,
    score:
      denominator <= 0
        ? 1
        : Number(((item.score - minScore) / denominator).toFixed(6)),
  }));
}
