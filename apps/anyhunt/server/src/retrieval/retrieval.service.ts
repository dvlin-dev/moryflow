/**
 * [INPUT]: platformUserId + apiKeyId + retrieval query DTO
 * [OUTPUT]: sources search / unified retrieval results
 * [POS]: Retrieval 平台编排服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BillingService } from '../billing/billing.service';
import { GraphContextService } from '../graph';
import { normalizeAndRankResults } from './retrieval-score.utils';
import { MemoryFactSearchService } from './memory-fact-search.service';
import { SourceSearchService } from './source-search.service';
import type {
  SearchRetrievalInputDto,
  SearchRetrievalResponseDto,
  SearchSourcesInputDto,
  SearchSourcesResponseDto,
} from './dto';
import type { RetrievalScopeFilters, RetrievalResult } from './retrieval.types';

const DEFAULT_RETRIEVAL_THRESHOLD = 0.2;

@Injectable()
export class RetrievalService {
  constructor(
    private readonly sourceSearchService: SourceSearchService,
    private readonly memoryFactSearchService: MemoryFactSearchService,
    private readonly graphContextService: GraphContextService,
    private readonly billingService: BillingService,
  ) {}

  async searchSources(
    platformUserId: string,
    apiKeyId: string,
    dto: SearchSourcesInputDto,
  ): Promise<SearchSourcesResponseDto> {
    return this.withBilling(platformUserId, 'memox.source.search', async () => {
      const results = await this.sourceSearchService.search({
        apiKeyId,
        query: dto.query,
        topK: dto.top_k,
        threshold: dto.threshold ?? DEFAULT_RETRIEVAL_THRESHOLD,
        filters: this.buildScopeFilters(dto),
      });

      const ranked = normalizeAndRankResults(results, dto.top_k);
      return {
        results: dto.include_graph_context
          ? await this.attachGraphContexts(apiKeyId, ranked)
          : ranked,
        total: ranked.length,
      };
    });
  }

  async search(
    platformUserId: string,
    apiKeyId: string,
    dto: SearchRetrievalInputDto,
  ): Promise<SearchRetrievalResponseDto> {
    return this.withBilling(
      platformUserId,
      'memox.retrieval.search',
      async () => {
        const filters = this.buildScopeFilters(dto);
        const threshold = dto.threshold ?? DEFAULT_RETRIEVAL_THRESHOLD;
        const tasks: Array<Promise<RetrievalResult[]>> = [];

        if (dto.include_memory_facts) {
          tasks.push(
            this.memoryFactSearchService.search({
              apiKeyId,
              query: dto.query,
              topK: dto.top_k,
              threshold,
              filters,
            }),
          );
        }

        if (dto.include_sources) {
          tasks.push(
            this.sourceSearchService.search({
              apiKeyId,
              query: dto.query,
              topK: dto.top_k,
              threshold,
              filters,
            }),
          );
        }

        const settled = await Promise.all(tasks);
        const ranked = normalizeAndRankResults(settled.flat(), dto.top_k);
        return {
          items: dto.include_graph_context
            ? await this.attachGraphContexts(apiKeyId, ranked)
            : ranked,
          total: ranked.length,
        };
      },
    );
  }

  private buildScopeFilters(
    dto: SearchSourcesInputDto | SearchRetrievalInputDto,
  ): RetrievalScopeFilters {
    return {
      userId: dto.user_id ?? null,
      agentId: dto.agent_id ?? null,
      appId: dto.app_id ?? null,
      runId: dto.run_id ?? null,
      orgId: dto.org_id ?? null,
      projectId: dto.project_id ?? null,
      metadata: dto.metadata ?? null,
      sourceTypes: dto.source_types ?? [],
      categories: 'categories' in dto ? (dto.categories ?? []) : [],
      filters: 'filters' in dto ? dto.filters : undefined,
    };
  }

  private async withBilling<T>(
    userId: string,
    billingKey: 'memox.source.search' | 'memox.retrieval.search',
    execute: () => Promise<T>,
  ): Promise<T> {
    const referenceId = randomUUID();
    const billing = await this.billingService.deductOrThrow({
      userId,
      billingKey,
      referenceId,
    });

    try {
      return await execute();
    } catch (error) {
      if (billing) {
        await this.billingService.refundOnFailure({
          userId,
          billingKey,
          referenceId,
          breakdown: billing.deduct.breakdown,
        });
      }
      throw error;
    }
  }

  private async attachGraphContexts<T extends RetrievalResult>(
    apiKeyId: string,
    items: T[],
  ): Promise<T[]> {
    const memoryFactIds = items
      .filter(
        (item): item is Extract<T, { result_kind: 'memory_fact' }> =>
          item.result_kind === 'memory_fact',
      )
      .map((item) => item.memory_fact_id);
    const sourceIds = items
      .filter(
        (item): item is Extract<T, { result_kind: 'source' }> =>
          item.result_kind === 'source',
      )
      .map((item) => item.source_id);
    const [memoryContexts, sourceContexts] = await Promise.all([
      this.graphContextService.getForMemoryFacts(apiKeyId, memoryFactIds),
      this.graphContextService.getForSources(apiKeyId, sourceIds),
    ]);

    return items.map((item) => {
      const graphContext =
        item.result_kind === 'memory_fact'
          ? memoryContexts.get(item.memory_fact_id)
          : sourceContexts.get(item.source_id);

      return graphContext
        ? ({
            ...item,
            graph_context: graphContext,
          } as T)
        : item;
    });
  }
}
