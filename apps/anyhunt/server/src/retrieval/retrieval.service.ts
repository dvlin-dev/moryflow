/**
 * [INPUT]: platformUserId + apiKeyId + retrieval query DTO
 * [OUTPUT]: sources search / unified retrieval results
 * [POS]: Retrieval 平台编排服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BillingService } from '../billing/billing.service';
import { EmbeddingService } from '../embedding';
import {
  createGraphScopeRequiredError,
  GraphContextService,
  GraphScopeService,
} from '../graph';
import { normalizeAndRankResults } from './retrieval-score.utils';
import { MemoryFactSearchService } from './memory-fact-search.service';
import { SourceSearchService } from './source-search.service';
import type {
  SearchRetrievalInputDto,
  SearchRetrievalResponseDto,
  SearchSourcesInputDto,
  SearchSourcesResponseDto,
} from './dto';
import type {
  GroupedRetrievalResult,
  MemoryFactSearchResult,
  RetrievalResult,
  RetrievalResultGroup,
  RetrievalScopeFilters,
  SourceSearchResult,
} from './retrieval.types';

const DEFAULT_RETRIEVAL_THRESHOLD = 0.2;

@Injectable()
export class RetrievalService {
  constructor(
    private readonly sourceSearchService: SourceSearchService,
    private readonly memoryFactSearchService: MemoryFactSearchService,
    private readonly graphContextService: GraphContextService,
    private readonly graphScopeService: GraphScopeService,
    private readonly billingService: BillingService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async searchSources(
    platformUserId: string,
    apiKeyId: string,
    dto: SearchSourcesInputDto,
  ): Promise<SearchSourcesResponseDto> {
    return this.withBilling(platformUserId, 'memox.source.search', async () => {
      const graphScopeId = await this.resolveOptionalGraphScopeId(
        apiKeyId,
        dto.include_graph_context,
        dto.project_id ?? undefined,
      );
      const results = await this.sourceSearchService.search({
        apiKeyId,
        query: dto.query,
        topK: dto.top_k,
        threshold: dto.threshold ?? DEFAULT_RETRIEVAL_THRESHOLD,
        filters: this.buildScopeFilters(dto),
      });

      const ranked = normalizeAndRankResults(results, dto.top_k);
      return {
        results: graphScopeId
          ? await this.attachGraphContexts(graphScopeId, ranked)
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
        const graphScopeId = await this.resolveOptionalGraphScopeId(
          apiKeyId,
          dto.include_graph_context,
          dto.scope.project_id ?? undefined,
        );
        const filters = this.buildScopeFilters(dto);
        const threshold = dto.threshold ?? DEFAULT_RETRIEVAL_THRESHOLD;
        const sourceLimit = dto.group_limits.sources;
        const factLimit = dto.group_limits.memory_facts;
        const shouldSearchSources = sourceLimit > 0;
        const shouldSearchFacts = factLimit > 0;
        const sharedQueryEmbedding =
          shouldSearchSources && shouldSearchFacts
            ? (await this.embeddingService.generateEmbedding(dto.query))
                .embedding
            : undefined;

        const [rawFacts, rawFiles] = await Promise.all([
          shouldSearchFacts
            ? this.memoryFactSearchService.search({
                apiKeyId,
                query: dto.query,
                topK: factLimit + 1,
                threshold,
                filters,
                queryEmbedding: sharedQueryEmbedding,
              })
            : Promise.resolve([]),
          shouldSearchSources
            ? this.sourceSearchService.search({
                apiKeyId,
                query: dto.query,
                topK: sourceLimit + 1,
                threshold,
                filters,
                queryEmbedding: sharedQueryEmbedding,
              })
            : Promise.resolve([]),
        ]);

        const [factItems, fileItems] = graphScopeId
          ? await Promise.all([
              this.attachGraphContexts(
                graphScopeId,
                normalizeAndRankResults(rawFacts, factLimit),
              ),
              this.attachGraphContexts(
                graphScopeId,
                normalizeAndRankResults(rawFiles, sourceLimit),
              ),
            ])
          : [
              normalizeAndRankResults(rawFacts, factLimit),
              normalizeAndRankResults(rawFiles, sourceLimit),
            ];

        return this.buildGroupedResponse({
          facts: {
            items: factItems,
            rawCount: rawFacts.length,
            limit: factLimit,
          },
          files: {
            items: fileItems,
            rawCount: rawFiles.length,
            limit: sourceLimit,
          },
        });
      },
    );
  }

  private buildScopeFilters(
    dto: SearchSourcesInputDto | SearchRetrievalInputDto,
  ): RetrievalScopeFilters {
    const scope = 'scope' in dto ? dto.scope : dto;
    return {
      userId: scope.user_id ?? null,
      agentId: scope.agent_id ?? null,
      appId: scope.app_id ?? null,
      runId: scope.run_id ?? null,
      orgId: scope.org_id ?? null,
      projectId: scope.project_id ?? null,
      metadata: scope.metadata ?? null,
      sourceTypes: dto.source_types ?? [],
      categories: 'categories' in dto ? (dto.categories ?? []) : [],
      filters: 'filters' in dto ? dto.filters : undefined,
    };
  }

  private async resolveOptionalGraphScopeId(
    apiKeyId: string,
    includeGraphContext: boolean | undefined,
    projectId?: string | null,
  ): Promise<string | null> {
    if (!includeGraphContext) {
      return null;
    }

    if (!projectId?.trim()) {
      throw createGraphScopeRequiredError('read');
    }

    const graphScope = await this.graphScopeService.getScope(
      apiKeyId,
      projectId,
    );
    return graphScope?.id ?? null;
  }

  private buildGroupedResponse(params: {
    files: {
      items: SourceSearchResult[];
      rawCount: number;
      limit: number;
    };
    facts: {
      items: MemoryFactSearchResult[];
      rawCount: number;
      limit: number;
    };
  }): GroupedRetrievalResult {
    return {
      groups: {
        files: this.toGroup(params.files),
        facts: this.toGroup(params.facts),
      },
    };
  }

  private toGroup<T extends RetrievalResult>(params: {
    items: T[];
    rawCount: number;
    limit: number;
  }): RetrievalResultGroup<T> {
    return {
      items: params.items,
      returned_count: params.items.length,
      hasMore: params.rawCount > params.limit,
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
    graphScopeId: string,
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
      this.graphContextService.getForMemoryFacts(graphScopeId, memoryFactIds),
      this.graphContextService.getForSources(graphScopeId, sourceIds),
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
