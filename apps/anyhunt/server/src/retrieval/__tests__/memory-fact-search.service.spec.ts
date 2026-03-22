import { describe, expect, it, vi } from 'vitest';
import { MemoryFactSearchService } from '../memory-fact-search.service';
import type { MemoryRepository } from '../../memory/memory.repository';
import type { EmbeddingService } from '../../embedding';

describe('MemoryFactSearchService', () => {
  it('合并 semantic 与 keyword 命中为 memory_fact 结果', async () => {
    const memoryRepository = {
      searchSimilar: vi.fn().mockResolvedValue([
        {
          id: 'memory-1',
          content: 'Alpha project note',
          metadata: { source: 'chat' },
          originKind: 'SOURCE_DERIVED',
          immutable: true,
          sourceId: 'source-1',
          sourceRevisionId: 'revision-1',
          derivedKey: 'fact:alpha',
          similarity: 0.82,
        },
      ]),
      searchByKeyword: vi.fn().mockResolvedValue([
        {
          id: 'memory-1',
          content: 'Alpha project note',
          metadata: { source: 'chat' },
          originKind: 'SOURCE_DERIVED',
          immutable: true,
          sourceId: 'source-1',
          sourceRevisionId: 'revision-1',
          derivedKey: 'fact:alpha',
        },
        {
          id: 'memory-2',
          content: 'Beta task list',
          metadata: null,
          originKind: 'MANUAL',
          immutable: false,
          sourceId: null,
          sourceRevisionId: null,
          derivedKey: null,
        },
      ]),
    } as unknown as MemoryRepository;
    const embeddingService = {
      generateEmbedding: vi.fn().mockResolvedValue({
        embedding: [0.1, 0.2],
        model: 'mock',
        dimensions: 2,
      }),
    } as unknown as EmbeddingService;

    const service = new MemoryFactSearchService(
      memoryRepository,
      embeddingService,
    );

    const result = await service.search({
      apiKeyId: 'api-key-1',
      query: 'alpha project',
      topK: 5,
      threshold: 0.2,
      filters: {},
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      result_kind: 'memory_fact',
      memory_fact_id: 'memory-1',
      origin_kind: 'SOURCE_DERIVED',
      immutable: true,
      source_id: 'source-1',
      source_revision_id: 'revision-1',
      derived_key: 'fact:alpha',
    });
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });
});
