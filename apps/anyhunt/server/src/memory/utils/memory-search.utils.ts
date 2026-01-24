/**
 * [PROVIDES]: Memory 搜索 rerank 工具
 * [DEPENDS]: Memory types
 * [POS]: Search rerank 逻辑
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { Memory, MemoryWithSimilarity } from '../memory.repository';

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function computeRerankScore(
  queryTokens: string[],
  memory: Memory | MemoryWithSimilarity,
): number {
  const memoryText = memory.memory.toLowerCase();
  const hits = queryTokens.filter((token) => memoryText.includes(token));
  const keywordScore = queryTokens.length
    ? hits.length / queryTokens.length
    : 0;
  const similarity =
    typeof (memory as MemoryWithSimilarity).similarity === 'number'
      ? (memory as MemoryWithSimilarity).similarity
      : 0;

  return similarity * 0.8 + keywordScore * 0.2;
}

export function rerankMemories(
  query: string,
  memories: Memory[] | MemoryWithSimilarity[],
): Memory[] | MemoryWithSimilarity[] {
  const queryTokens = tokenizeQuery(query);
  if (queryTokens.length === 0) {
    return memories;
  }

  return [...memories].sort((a, b) => {
    const scoreB = computeRerankScore(queryTokens, b);
    const scoreA = computeRerankScore(queryTokens, a);
    return scoreB - scoreA;
  });
}
