import { describe, expect, it } from 'vitest';
import {
  aggregateSourceCandidates,
  buildSourceSearchResults,
  mergeSourceChunkHits,
} from '../source-search.aggregator';

describe('source-search.aggregator', () => {
  it('merges chunk hits, aggregates by source, and builds stable file-level results', () => {
    const merged = mergeSourceChunkHits(
      ['alpha', 'retrieval'],
      [
        {
          chunkId: 'chunk-1',
          sourceId: 'source-1',
          revisionId: 'revision-1',
          chunkIndex: 1,
          chunkCount: 3,
          content: 'Alpha paragraph about retrieval',
          sourceType: 'vault_file',
          externalId: 'file-1',
          projectId: 'vault-1',
          displayPath: '/alpha.md',
          title: 'Alpha Doc',
          sourceMetadata: { path: '/alpha.md' },
          score: 0.81,
        },
      ],
      [
        {
          chunkId: 'chunk-2',
          sourceId: 'source-1',
          revisionId: 'revision-1',
          chunkIndex: 2,
          chunkCount: 3,
          content: 'Alpha project retrieval details',
          sourceType: 'vault_file',
          externalId: 'file-1',
          projectId: 'vault-1',
          displayPath: '/alpha.md',
          title: 'Alpha Doc',
          sourceMetadata: { path: '/alpha.md' },
          score: 1,
        },
      ],
    );

    const candidates = aggregateSourceCandidates(merged);
    const results = buildSourceSearchResults(
      candidates,
      new Map([
        [
          'revision-1:2',
          [
            { chunkIndex: 1, content: 'Alpha paragraph about retrieval' },
            { chunkIndex: 2, content: 'Alpha project retrieval details' },
          ],
        ],
      ]),
      5,
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      result_kind: 'source',
      id: 'source-1',
      source_id: 'source-1',
      external_id: 'file-1',
      title: 'Alpha Doc',
    });
    expect(results[0].snippet).toContain('Alpha paragraph about retrieval');
    expect(results[0].snippet).toContain('Alpha project retrieval details');
    expect(results[0].matched_chunks).toEqual([
      { chunk_id: 'chunk-2', chunk_index: 2 },
      { chunk_id: 'chunk-1', chunk_index: 1 },
    ]);
  });
});
