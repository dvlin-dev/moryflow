/**
 * [INPUT]: apiKeyId + retrieval query
 * [OUTPUT]: MemoryFactResult[]（未归一化 raw score）
 * [POS]: Retrieval 对 MemoryFact 的子域搜索服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable } from '@nestjs/common';
import { EmbeddingService } from '../embedding';
import {
  MemoryRepository,
  type Memory,
  type MemoryWithSimilarity,
} from '../memory/memory.repository';
import { buildFilters } from '../memory/filters/memory-filters.utils';
import type { JsonValue } from '../common/utils/json.zod';
import {
  computeKeywordMatchScore,
  tokenizeSearchQuery,
} from './retrieval-score.utils';
import type {
  MemoryFactSearchResult,
  RetrievalScopeFilters,
} from './retrieval.types';

@Injectable()
export class MemoryFactSearchService {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(params: {
    apiKeyId: string;
    query: string;
    topK: number;
    threshold: number;
    filters: RetrievalScopeFilters;
    queryEmbedding?: number[];
  }): Promise<MemoryFactSearchResult[]> {
    const { apiKeyId, query, topK, threshold, filters } = params;
    const queryTokens = tokenizeSearchQuery(query);
    const candidateLimit = Math.min(topK * 4, 100);
    const memoryFilters = buildFilters({
      user_id: filters.userId ?? undefined,
      agent_id: filters.agentId ?? undefined,
      app_id: filters.appId ?? undefined,
      run_id: filters.runId ?? undefined,
      org_id: filters.orgId ?? undefined,
      project_id: filters.projectId ?? undefined,
      metadata: filters.metadata ?? null,
      categories: filters.categories ?? [],
      filters: filters.filters,
    });

    const queryEmbedding =
      params.queryEmbedding ??
      (await this.embeddingService.generateEmbedding(query)).embedding;
    const [semanticHits, keywordHits] = await Promise.all([
      this.memoryRepository.searchSimilar({
        apiKeyId,
        embedding: queryEmbedding,
        limit: candidateLimit,
        threshold,
        filters: memoryFilters,
      }),
      this.memoryRepository.searchByKeyword({
        apiKeyId,
        query,
        limit: candidateLimit,
        filters: memoryFilters,
      }),
    ]);

    const merged = new Map<string, MemoryFactSearchResult>();

    for (const hit of semanticHits) {
      const score = typeof hit.similarity === 'number' ? hit.similarity : 0;
      merged.set(hit.id, this.toResult(hit, score));
    }

    for (const hit of keywordHits) {
      const keywordScore = computeKeywordMatchScore(hit.content, queryTokens);
      const existing = merged.get(hit.id);
      if (!existing) {
        merged.set(hit.id, this.toResult(hit, keywordScore));
        continue;
      }

      existing.score = Math.min(
        1,
        Math.max(existing.score, keywordScore) + 0.1,
      );
    }

    return [...merged.values()].sort((left, right) => right.score - left.score);
  }

  private toResult(
    memory: Memory | MemoryWithSimilarity,
    score: number,
  ): MemoryFactSearchResult {
    return {
      result_kind: 'memory_fact',
      id: memory.id,
      score,
      rank: 0,
      memory_fact_id: memory.id,
      content: memory.content,
      metadata: this.toNullableMetadata(memory.metadata),
      origin_kind: memory.originKind,
      immutable: memory.immutable,
      source_id: memory.sourceId,
      source_revision_id: memory.sourceRevisionId,
      derived_key: memory.derivedKey,
    };
  }

  private toNullableMetadata(value: unknown): Record<string, JsonValue> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, JsonValue>)
      : null;
  }
}
