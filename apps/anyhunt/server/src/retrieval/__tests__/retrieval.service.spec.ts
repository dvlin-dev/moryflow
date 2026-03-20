import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RetrievalService } from '../retrieval.service';
import type { SourceSearchService } from '../source-search.service';
import type { MemoryFactSearchService } from '../memory-fact-search.service';
import type { BillingService } from '../../billing/billing.service';
import type { GraphContextService, GraphScopeService } from '../../graph';
import type { EmbeddingService } from '../../embedding';

describe('RetrievalService', () => {
  const billingService = {
    deductOrThrow: vi.fn().mockResolvedValue({
      deduct: { breakdown: { credits: 1 } },
    }),
    refundOnFailure: vi.fn().mockResolvedValue(undefined),
  } as unknown as BillingService;
  const embeddingService = {
    generateEmbedding: vi.fn().mockResolvedValue({
      embedding: [0.1, 0.2],
      model: 'mock',
      dimensions: 2,
    }),
  } as unknown as EmbeddingService;
  const graphContextService = {
    getForMemoryFacts: vi.fn().mockResolvedValue(new Map()),
    getForSources: vi.fn().mockResolvedValue(new Map()),
    getForMemoryFact: vi.fn().mockResolvedValue(null),
    getForSource: vi.fn().mockResolvedValue(null),
  } as unknown as GraphContextService;
  const graphScopeService = {
    getScope: vi.fn().mockResolvedValue({
      id: 'graph-scope-1',
      apiKeyId: 'api-key-1',
      projectId: 'project-1',
    }),
  } as unknown as GraphScopeService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reuses one query embedding across memory/source retrieval branches', async () => {
    const sourceSearchService = {
      search: vi.fn().mockResolvedValue([]),
    } as unknown as SourceSearchService;
    const memoryFactSearchService = {
      search: vi.fn().mockResolvedValue([]),
    } as unknown as MemoryFactSearchService;

    const service = new RetrievalService(
      sourceSearchService,
      memoryFactSearchService,
      graphContextService,
      graphScopeService,
      billingService,
      embeddingService,
    );

    await service.search('user-1', 'api-key-1', {
      query: 'alpha',
      group_limits: {
        sources: 10,
        memory_facts: 10,
      },
      include_graph_context: false,
      scope: {},
      source_types: [],
      categories: [],
    } as any);

    expect((embeddingService as any).generateEmbedding).toHaveBeenCalledTimes(
      1,
    );
    expect((memoryFactSearchService as any).search).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyId: 'api-key-1',
        query: 'alpha',
        topK: 11,
        queryEmbedding: [0.1, 0.2],
      }),
    );
    expect((sourceSearchService as any).search).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyId: 'api-key-1',
        query: 'alpha',
        topK: 11,
        queryEmbedding: [0.1, 0.2],
      }),
    );
  });

  it('returns grouped retrieval results with independent ranking', async () => {
    const sourceSearchService = {
      search: vi.fn().mockResolvedValue([
        {
          result_kind: 'source',
          id: 'source-1',
          score: 0.6,
          rank: 0,
          source_id: 'source-1',
          source_type: 'vault_file',
          title: 'Alpha Doc',
          snippet: 'Alpha',
          matched_chunks: [{ chunk_id: 'chunk-1', chunk_index: 0 }],
          metadata: null,
        },
      ]),
    } as unknown as SourceSearchService;
    const memoryFactSearchService = {
      search: vi.fn().mockResolvedValue([
        {
          result_kind: 'memory_fact',
          id: 'memory-1',
          score: 0.9,
          rank: 0,
          memory_fact_id: 'memory-1',
          content: 'Remember alpha',
          metadata: null,
        },
      ]),
    } as unknown as MemoryFactSearchService;

    const service = new RetrievalService(
      sourceSearchService,
      memoryFactSearchService,
      graphContextService,
      graphScopeService,
      billingService,
      embeddingService,
    );

    const result = await service.search('user-1', 'api-key-1', {
      query: 'alpha',
      group_limits: {
        sources: 2,
        memory_facts: 2,
      },
      include_graph_context: false,
      scope: {},
      source_types: [],
      categories: [],
    });

    expect(result.groups.facts.returned_count).toBe(1);
    expect(result.groups.files.returned_count).toBe(1);
    expect(result.groups.facts.items[0]).toMatchObject({
      result_kind: 'memory_fact',
      rank: 1,
    });
    expect(result.groups.files.items[0]).toMatchObject({
      result_kind: 'source',
      rank: 1,
    });
  });

  it('computes hasMore independently per group', async () => {
    const sourceSearchService = {
      search: vi.fn().mockResolvedValue([
        {
          result_kind: 'source',
          id: 'source-1',
          score: 0.9,
          rank: 0,
          source_id: 'source-1',
          source_type: 'vault_file',
          title: 'Alpha Doc',
          snippet: 'Alpha',
          matched_chunks: [{ chunk_id: 'chunk-1', chunk_index: 0 }],
          metadata: null,
        },
        {
          result_kind: 'source',
          id: 'source-2',
          score: 0.8,
          rank: 0,
          source_id: 'source-2',
          source_type: 'vault_file',
          title: 'Beta Doc',
          snippet: 'Beta',
          matched_chunks: [{ chunk_id: 'chunk-2', chunk_index: 0 }],
          metadata: null,
        },
      ]),
    } as unknown as SourceSearchService;
    const memoryFactSearchService = {
      search: vi.fn().mockResolvedValue([
        {
          result_kind: 'memory_fact',
          id: 'memory-1',
          score: 0.7,
          rank: 0,
          memory_fact_id: 'memory-1',
          content: 'Remember alpha',
          metadata: null,
        },
      ]),
    } as unknown as MemoryFactSearchService;

    const service = new RetrievalService(
      sourceSearchService,
      memoryFactSearchService,
      graphContextService,
      graphScopeService,
      billingService,
      embeddingService,
    );

    const result = await service.search('user-1', 'api-key-1', {
      query: 'alpha',
      group_limits: {
        sources: 1,
        memory_facts: 1,
      },
      include_graph_context: false,
      scope: {},
      source_types: [],
      categories: [],
    } as any);

    expect(result.groups.files.hasMore).toBe(true);
    expect(result.groups.files.returned_count).toBe(1);
    expect(result.groups.facts.hasMore).toBe(false);
    expect(result.groups.facts.returned_count).toBe(1);
  });

  it('does not query graph context when include_graph_context=false', async () => {
    const sourceSearchService = {
      search: vi.fn().mockResolvedValue([]),
    } as unknown as SourceSearchService;
    const memoryFactSearchService = {
      search: vi.fn().mockResolvedValue([
        {
          result_kind: 'memory_fact',
          id: 'memory-1',
          score: 0.9,
          rank: 0,
          memory_fact_id: 'memory-1',
          content: 'Remember alpha',
          metadata: null,
        },
      ]),
    } as unknown as MemoryFactSearchService;

    const service = new RetrievalService(
      sourceSearchService,
      memoryFactSearchService,
      graphContextService,
      graphScopeService,
      billingService,
      embeddingService,
    );

    await service.search('user-1', 'api-key-1', {
      query: 'alpha',
      group_limits: {
        sources: 0,
        memory_facts: 10,
      },
      include_graph_context: false,
      scope: {},
      source_types: [],
      categories: [],
    } as any);

    expect(
      (graphContextService as any).getForMemoryFacts,
    ).not.toHaveBeenCalled();
    expect((graphContextService as any).getForSources).not.toHaveBeenCalled();
    expect((graphScopeService as any).getScope).not.toHaveBeenCalled();
  });

  it('loads graph context inside the resolved graph scope', async () => {
    const sourceSearchService = {
      search: vi.fn().mockResolvedValue([
        {
          result_kind: 'source',
          id: 'source-1',
          score: 0.6,
          rank: 0,
          source_id: 'source-1',
          source_type: 'vault_file',
          title: 'Alpha Doc',
          snippet: 'Alpha',
          matched_chunks: [{ chunk_id: 'chunk-1', chunk_index: 0 }],
          metadata: null,
        },
      ]),
    } as unknown as SourceSearchService;
    const memoryFactSearchService = {
      search: vi.fn().mockResolvedValue([
        {
          result_kind: 'memory_fact',
          id: 'memory-1',
          score: 0.9,
          rank: 0,
          memory_fact_id: 'memory-1',
          content: 'Remember alpha',
          metadata: null,
        },
      ]),
    } as unknown as MemoryFactSearchService;

    const service = new RetrievalService(
      sourceSearchService,
      memoryFactSearchService,
      graphContextService,
      graphScopeService,
      billingService,
      embeddingService,
    );

    await service.search('user-1', 'api-key-1', {
      query: 'alpha',
      group_limits: {
        sources: 10,
        memory_facts: 10,
      },
      include_graph_context: true,
      scope: {
        project_id: 'project-1',
      },
      source_types: [],
      categories: [],
    } as any);

    expect((graphScopeService as any).getScope).toHaveBeenCalledWith(
      'api-key-1',
      'project-1',
    );
    expect((graphContextService as any).getForMemoryFacts).toHaveBeenCalledWith(
      'graph-scope-1',
      ['memory-1'],
    );
    expect((graphContextService as any).getForSources).toHaveBeenCalledWith(
      'graph-scope-1',
      ['source-1'],
    );
  });

  it('graph scope 不存在时会优雅降级为无 graph context 的检索结果', async () => {
    const sourceSearchService = {
      search: vi.fn().mockResolvedValue([
        {
          result_kind: 'source',
          id: 'source-1',
          score: 0.7,
          rank: 0,
          source_id: 'source-1',
          source_type: 'vault_file',
          title: 'Alpha Doc',
          snippet: 'Alpha',
          matched_chunks: [{ chunk_id: 'chunk-1', chunk_index: 0 }],
          metadata: null,
        },
      ]),
    } as unknown as SourceSearchService;
    const memoryFactSearchService = {
      search: vi.fn().mockResolvedValue([
        {
          result_kind: 'memory_fact',
          id: 'memory-1',
          score: 0.8,
          rank: 0,
          memory_fact_id: 'memory-1',
          content: 'Remember alpha',
          metadata: null,
        },
      ]),
    } as unknown as MemoryFactSearchService;
    (graphScopeService as any).getScope.mockResolvedValueOnce(null);

    const service = new RetrievalService(
      sourceSearchService,
      memoryFactSearchService,
      graphContextService,
      graphScopeService,
      billingService,
      embeddingService,
    );

    const result = await service.search('user-1', 'api-key-1', {
      query: 'alpha',
      group_limits: {
        sources: 10,
        memory_facts: 10,
      },
      include_graph_context: true,
      scope: {
        project_id: 'project-1',
      },
      source_types: [],
      categories: [],
    } as any);

    expect(result.groups.files.items[0]).not.toHaveProperty('graph_context');
    expect(result.groups.facts.items[0]).not.toHaveProperty('graph_context');
    expect(
      (graphContextService as any).getForMemoryFacts,
    ).not.toHaveBeenCalled();
    expect((graphContextService as any).getForSources).not.toHaveBeenCalled();
  });
});
