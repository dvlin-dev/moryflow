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
      top_k: 10,
      include_memory_facts: true,
      include_sources: true,
      include_graph_context: false,
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
        queryEmbedding: [0.1, 0.2],
      }),
    );
    expect((sourceSearchService as any).search).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyId: 'api-key-1',
        query: 'alpha',
        queryEmbedding: [0.1, 0.2],
      }),
    );
  });

  it('统一合并 source 与 memory_fact 结果并重排 rank', async () => {
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
      top_k: 10,
      include_graph_context: false,
      include_memory_facts: true,
      include_sources: true,
      source_types: [],
      categories: [],
    });

    expect(result.total).toBe(2);
    expect(result.items[0]).toMatchObject({
      result_kind: 'memory_fact',
      rank: 1,
    });
    expect(result.items[1]).toMatchObject({
      result_kind: 'source',
      rank: 2,
    });
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
      top_k: 10,
      include_memory_facts: true,
      include_sources: false,
      include_graph_context: false,
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
      top_k: 10,
      include_memory_facts: true,
      include_sources: true,
      include_graph_context: true,
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
