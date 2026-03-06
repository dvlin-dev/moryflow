import { describe, expect, it, vi } from 'vitest';
import { SourceSearchService } from '../source-search.service';
import type { SourceSearchRepository } from '../source-search.repository';
import type { EmbeddingService } from '../../embedding';

describe('SourceSearchService', () => {
  it('按 source 聚合 chunk 命中并生成 snippet', async () => {
    const repository = {
      searchSimilar: vi.fn().mockResolvedValue([
        {
          chunkId: 'chunk-1',
          sourceId: 'source-1',
          revisionId: 'revision-1',
          chunkIndex: 1,
          chunkCount: 3,
          content: 'Alpha paragraph about retrieval',
          sourceType: 'vault_file',
          title: 'Alpha Doc',
          sourceMetadata: { path: '/alpha.md' },
          score: 0.81,
        },
      ]),
      searchByKeyword: vi.fn().mockResolvedValue([
        {
          chunkId: 'chunk-2',
          sourceId: 'source-1',
          revisionId: 'revision-1',
          chunkIndex: 2,
          chunkCount: 3,
          content: 'Alpha project retrieval details',
          sourceType: 'vault_file',
          title: 'Alpha Doc',
          sourceMetadata: { path: '/alpha.md' },
          score: 1,
        },
      ]),
      findChunkWindow: vi.fn().mockResolvedValue([
        {
          id: 'chunk-1',
          chunkIndex: 1,
          content: 'Alpha paragraph about retrieval',
        },
        {
          id: 'chunk-2',
          chunkIndex: 2,
          content: 'Alpha project retrieval details',
        },
      ]),
    } as unknown as SourceSearchRepository;
    const embeddingService = {
      generateEmbedding: vi.fn().mockResolvedValue({
        embedding: [0.1, 0.2],
        model: 'mock',
        dimensions: 2,
      }),
    } as unknown as EmbeddingService;

    const service = new SourceSearchService(repository, embeddingService);

    const results = await service.search({
      apiKeyId: 'api-key-1',
      query: 'alpha retrieval',
      topK: 5,
      threshold: 0.2,
      filters: {},
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      result_kind: 'source',
      source_id: 'source-1',
      source_type: 'vault_file',
      title: 'Alpha Doc',
    });
    expect(results[0].matched_chunks).toHaveLength(2);
    expect(results[0].snippet).toContain('Alpha');
  });
});
