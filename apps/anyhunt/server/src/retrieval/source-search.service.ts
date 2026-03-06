/**
 * [INPUT]: apiKeyId + retrieval query
 * [OUTPUT]: SourceResult[]（未归一化 raw score）
 * [POS]: Retrieval 对 Source 的子域搜索服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import type { JsonValue } from '../common/utils/json.zod';
import { EmbeddingService } from '../embedding';
import {
  computeKeywordMatchScore,
  tokenizeSearchQuery,
  truncateSnippet,
} from './retrieval-score.utils';
import { SourceSearchRepository } from './source-search.repository';
import type {
  MatchedChunkReference,
  RetrievalScopeFilters,
  SourceChunkSearchRow,
  SourceSearchResult,
} from './retrieval.types';

interface AggregatedSourceCandidate {
  sourceId: string;
  sourceType: string;
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

@Injectable()
export class SourceSearchService {
  constructor(
    private readonly repository: SourceSearchRepository,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(params: {
    apiKeyId: string;
    query: string;
    topK: number;
    threshold: number;
    filters: RetrievalScopeFilters;
  }): Promise<SourceSearchResult[]> {
    const { apiKeyId, query, topK, threshold, filters } = params;
    const queryTokens = tokenizeSearchQuery(query);
    const candidateLimit = Math.min(topK * 6, 120);
    const embedding = await this.embeddingService.generateEmbedding(query);
    const [semanticHits, keywordHits] = await Promise.all([
      this.repository.searchSimilar({
        apiKeyId,
        embedding: embedding.embedding,
        limit: candidateLimit,
        threshold,
        filters,
      }),
      this.repository.searchByKeyword({
        apiKeyId,
        query,
        queryTokens,
        limit: candidateLimit,
        filters,
      }),
    ]);

    const mergedChunkHits = this.mergeChunkHits(
      queryTokens,
      semanticHits,
      keywordHits,
    );
    const aggregated = this.aggregateBySource(mergedChunkHits);
    const shortlisted = aggregated.slice(0, topK * 2);

    return Promise.all(
      shortlisted.map(async (candidate) => {
        const windowChunks = await this.repository.findChunkWindow(
          apiKeyId,
          candidate.revisionId,
          candidate.bestChunkIndex,
          1,
        );

        return {
          result_kind: 'source',
          id: candidate.sourceId,
          score: candidate.score,
          rank: 0,
          source_id: candidate.sourceId,
          source_type: candidate.sourceType,
          title: candidate.title,
          snippet: truncateSnippet(
            windowChunks.map((chunk) => chunk.content).join('\n\n'),
          ),
          matched_chunks: candidate.chunkScores
            .slice(0, 3)
            .map<MatchedChunkReference>((chunk) => ({
              chunk_id: chunk.chunkId,
              chunk_index: chunk.chunkIndex,
            })),
          metadata: candidate.metadata,
        } satisfies SourceSearchResult;
      }),
    );
  }

  private mergeChunkHits(
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

      existing.score = Math.min(
        1,
        Math.max(existing.score, keywordScore) + 0.1,
      );
    }

    return [...merged.values()].sort((left, right) => right.score - left.score);
  }

  private aggregateBySource(
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
}
