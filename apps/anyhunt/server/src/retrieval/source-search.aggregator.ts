/**
 * [PROVIDES]: chunk-hit merge + source aggregate + source result mapping
 * [DEPENDS]: retrieval types, retrieval score utils
 * [POS]: Retrieval Source 子域纯聚合层
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { JsonValue } from '../common/utils/json.zod';
import {
  computeKeywordMatchScore,
  truncateSnippet,
} from './retrieval-score.utils';
import type {
  MatchedChunkReference,
  SourceChunkSearchRow,
  SourceSearchResult,
} from './retrieval.types';

export interface AggregatedSourceCandidate {
  sourceId: string;
  sourceType: string;
  externalId: string | null;
  projectId: string | null;
  displayPath: string | null;
  title: string;
  metadata: Record<string, JsonValue> | null;
  revisionId: string;
  bestChunkIndex: number;
  score: number;
  chunkScores: Array<{
    chunkId: string;
    chunkIndex: number;
    score: number;
  }>;
}

export function buildChunkWindowKey(
  revisionId: string,
  centerChunkIndex: number,
): string {
  return `${revisionId}:${centerChunkIndex}`;
}

export function mergeSourceChunkHits(
  queryTokens: string[],
  semanticHits: SourceChunkSearchRow[],
  keywordHits: SourceChunkSearchRow[],
): SourceChunkSearchRow[] {
  const merged = new Map<string, SourceChunkSearchRow>();

  for (const hit of semanticHits) {
    merged.set(hit.chunkId, { ...hit, score: hit.score });
  }

  for (const hit of keywordHits) {
    const keywordScore = Math.max(
      hit.score / 2,
      computeKeywordMatchScore(hit.content, queryTokens),
    );
    const existing = merged.get(hit.chunkId);
    if (!existing) {
      merged.set(hit.chunkId, { ...hit, score: keywordScore });
      continue;
    }

    existing.score = Math.min(1, Math.max(existing.score, keywordScore) + 0.1);
  }

  return [...merged.values()].sort((left, right) => right.score - left.score);
}

export function aggregateSourceCandidates(
  chunkHits: SourceChunkSearchRow[],
): AggregatedSourceCandidate[] {
  const grouped = new Map<string, AggregatedSourceCandidate>();

  for (const hit of chunkHits) {
    const existing = grouped.get(hit.sourceId);
    const nextChunkScore = {
      chunkId: hit.chunkId,
      chunkIndex: hit.chunkIndex,
      score: hit.score,
    };
    if (!existing) {
      grouped.set(hit.sourceId, {
        sourceId: hit.sourceId,
        sourceType: hit.sourceType,
        externalId: hit.externalId,
        projectId: hit.projectId,
        displayPath: hit.displayPath,
        title: hit.title,
        metadata: hit.sourceMetadata,
        revisionId: hit.revisionId,
        bestChunkIndex: hit.chunkIndex,
        score: hit.score,
        chunkScores: [nextChunkScore],
      });
      continue;
    }

    existing.chunkScores.push(nextChunkScore);
    if (hit.score > existing.score) {
      existing.score = hit.score;
      existing.bestChunkIndex = hit.chunkIndex;
    }
  }

  return [...grouped.values()]
    .map((candidate) => ({
      ...candidate,
      score: Math.min(
        1,
        candidate.score +
          Math.min((candidate.chunkScores.length - 1) * 0.05, 0.15),
      ),
      chunkScores: [...candidate.chunkScores].sort(
        (left, right) => right.score - left.score,
      ),
    }))
    .sort((left, right) => right.score - left.score);
}

export function buildSourceSearchResults(
  candidates: AggregatedSourceCandidate[],
  windowContentMap: ReadonlyMap<string, string>,
  topK: number,
): SourceSearchResult[] {
  return candidates.slice(0, topK).map((candidate) => ({
    result_kind: 'source',
    id: candidate.sourceId,
    score: candidate.score,
    rank: 0,
    source_id: candidate.sourceId,
    source_type: candidate.sourceType,
    project_id: candidate.projectId,
    external_id: candidate.externalId,
    display_path: candidate.displayPath,
    title: candidate.title,
    snippet: truncateSnippet(
      windowContentMap.get(
        buildChunkWindowKey(candidate.revisionId, candidate.bestChunkIndex),
      ) ?? '',
    ),
    matched_chunks: candidate.chunkScores
      .slice(0, 3)
      .map<MatchedChunkReference>((chunk) => ({
        chunk_id: chunk.chunkId,
        chunk_index: chunk.chunkIndex,
      })),
    metadata: candidate.metadata,
  }));
}
