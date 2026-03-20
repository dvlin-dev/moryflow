/**
 * [INPUT]: apiKeyId + retrieval query
 * [OUTPUT]: SourceResult[]（未归一化 raw score）
 * [POS]: Retrieval 对 Source 的子域搜索服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable } from '@nestjs/common';
import { EmbeddingService } from '../embedding';
import { SourceSearchRepository } from './source-search.repository';
import {
  aggregateSourceCandidates,
  buildChunkWindowKey,
  buildSourceSearchResults,
  mergeSourceChunkHits,
} from './source-search.aggregator';
import { tokenizeSearchQuery } from './retrieval-score.utils';
import type {
  RetrievalScopeFilters,
  SourceSearchResult,
} from './retrieval.types';

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
    queryEmbedding?: number[];
  }): Promise<SourceSearchResult[]> {
    const { apiKeyId, query, topK, threshold, filters } = params;
    const queryTokens = tokenizeSearchQuery(query);
    const candidateLimit = Math.min(topK * 6, 120);
    const queryEmbedding =
      params.queryEmbedding ??
      (await this.embeddingService.generateEmbedding(query)).embedding;
    const [semanticHits, keywordHits] = await Promise.all([
      this.repository.searchSimilar({
        apiKeyId,
        embedding: queryEmbedding,
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

    const shortlisted = aggregateSourceCandidates(
      mergeSourceChunkHits(queryTokens, semanticHits, keywordHits),
    ).slice(0, topK * 2);
    if (shortlisted.length === 0) {
      return [];
    }

    const windowRows = await this.repository.findChunkWindowsForCandidates(
      apiKeyId,
      shortlisted.map((candidate) => ({
        revisionId: candidate.revisionId,
        centerChunkIndex: candidate.bestChunkIndex,
      })),
      2,
    );

    return buildSourceSearchResults(
      shortlisted,
      this.buildWindowChunkMap(windowRows),
      topK,
    );
  }

  private buildWindowChunkMap(
    rows: Array<{
      revisionId: string;
      centerChunkIndex: number;
      chunkIndex: number;
      content: string;
    }>,
  ): Map<string, Array<{ chunkIndex: number; content: string }>> {
    const grouped = new Map<
      string,
      Array<{ chunkIndex: number; content: string }>
    >();

    for (const row of rows) {
      const key = buildChunkWindowKey(row.revisionId, row.centerChunkIndex);
      const existing = grouped.get(key);
      if (existing) {
        existing.push({ chunkIndex: row.chunkIndex, content: row.content });
        continue;
      }

      grouped.set(key, [{ chunkIndex: row.chunkIndex, content: row.content }]);
    }

    // Sort chunks within each window by index
    for (const chunks of grouped.values()) {
      chunks.sort((left, right) => left.chunkIndex - right.chunkIndex);
    }

    return grouped;
  }
}
