import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RetrievalService } from '../retrieval.service';
import type { SourceSearchService } from '../source-search.service';
import type { MemoryFactSearchService } from '../memory-fact-search.service';
import type { BillingService } from '../../billing/billing.service';
import type { GraphContextService } from '../../graph';
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

  it('按 groups.files/groups.facts 返回双组结果并分别重排 rank', async () => {
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

  it('单域高分结果不会饿死另一组', async () => {
    const sourceSearchService = {
      search: vi.fn().mockResolvedValue([
        {
          result_kind: 'source',
          id: 'source-1',
          score: 0.91,
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
          score: 0.9,
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
          score: 0.3,
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

    expect(result.groups.files.items).toHaveLength(1);
    expect(result.groups.facts.items).toHaveLength(1);
    expect(result.groups.files.items[0]?.id).toBe('source-1');
    expect(result.groups.facts.items[0]?.id).toBe('memory-1');
  });

  it('通过 over-fetch 计算每组 hasMore', async () => {
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

  it('include_graph_context=false 时不应查询 graph context', async () => {
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
    expect(
      (graphContextService as any).getForMemoryFact,
    ).not.toHaveBeenCalled();
    expect((graphContextService as any).getForSource).not.toHaveBeenCalled();
  });

  it('include_graph_context=true 时应按域批量加载 graph context', async () => {
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
      scope: {},
      source_types: [],
      categories: [],
    } as any);

    expect((graphContextService as any).getForMemoryFacts).toHaveBeenCalledWith(
      'api-key-1',
      ['memory-1'],
    );
    expect((graphContextService as any).getForSources).toHaveBeenCalledWith(
      'api-key-1',
      ['source-1'],
    );
    expect(
      (graphContextService as any).getForMemoryFact,
    ).not.toHaveBeenCalled();
    expect((graphContextService as any).getForSource).not.toHaveBeenCalled();
  });
});
