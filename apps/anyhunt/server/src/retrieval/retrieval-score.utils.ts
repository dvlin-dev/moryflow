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

export function truncateSnippet(content: string, maxLength = 800): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export interface WindowChunk {
  chunkIndex: number;
  content: string;
}

/**
 * Build a snippet centered around the best-matching chunk, expanding
 * alternately to left and right neighbours within a character budget.
 */
export function buildCenteredSnippet(
  windowChunks: WindowChunk[],
  bestChunkIndex: number,
  maxLength = 800,
): string {
  if (windowChunks.length === 0) {
    return '';
  }

  const sorted = [...windowChunks]
    .filter((c) => c.content.trim().length > 0)
    .sort((a, b) => a.chunkIndex - b.chunkIndex);

  if (sorted.length === 0) {
    return '';
  }

  const centerIdx = sorted.findIndex((c) => c.chunkIndex === bestChunkIndex);

  // Fallback: best chunk not found in window — concatenate all and truncate
  if (centerIdx < 0) {
    return truncateSnippet(
      sorted.map((c) => c.content).join('\n\n'),
      maxLength,
    );
  }

  const centerContent = sorted[centerIdx].content.replace(/\s+/g, ' ').trim();

  // Single chunk or center already exceeds budget
  if (sorted.length === 1 || centerContent.length >= maxLength) {
    return truncateSnippet(centerContent, maxLength);
  }

  let result = centerContent;
  let budget = maxLength - result.length;
  let left = centerIdx - 1;
  let right = centerIdx + 1;

  while (budget > 0 && (left >= 0 || right < sorted.length)) {
    let expanded = false;

    if (left >= 0) {
      const leftText = sorted[left].content.replace(/\s+/g, ' ').trim();
      const separator = '\n\n';
      if (leftText.length + separator.length <= budget) {
        result = leftText + separator + result;
        budget -= leftText.length + separator.length;
        left--;
        expanded = true;
      } else {
        // Partial: take the tail (closest to center), reserving space for '…' + separator
        const available = budget - separator.length - 1; // -1 for '…'
        if (available > 0) {
          result =
            '…' +
            leftText.slice(-available).trimStart() +
            separator +
            result;
        }
        budget = 0;
        left = -1;
      }
    }

    if (right < sorted.length && budget > 0) {
      const rightText = sorted[right].content.replace(/\s+/g, ' ').trim();
      const separator = '\n\n';
      if (rightText.length + separator.length <= budget) {
        result = result + separator + rightText;
        budget -= rightText.length + separator.length;
        right++;
        expanded = true;
      } else {
        // Partial: take the head (closest to center), reserving space for separator + '…'
        const available = budget - separator.length - 1; // -1 for '…'
        if (available > 0) {
          result =
            result +
            separator +
            rightText.slice(0, available).trimEnd() +
            '…';
        }
        budget = 0;
        right = sorted.length;
      }
    }

    if (!expanded) {
      break;
    }
  }

  // Final safety: normalize whitespace and enforce max length
  const final = result.replace(/\s+/g, ' ').trim();
  if (final.length <= maxLength) {
    return final;
  }
  return `${final.slice(0, maxLength - 1).trimEnd()}…`;
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
