import { describe, expect, it, vi } from 'vitest';
import { MemoxSearchAdapterService } from './memox-search-adapter.service';
import type { MemoxClient } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';

describe('MemoxSearchAdapterService', () => {
  it('maps vault search to Memox sources/search and returns file-first results', async () => {
    const searchSources = vi.fn().mockResolvedValue({
      results: [
        {
          result_kind: 'source',
          id: 'source-1',
          score: 0.92,
          rank: 1,
          source_id: 'source-1',
          source_type: 'note_markdown',
          project_id: 'vault-1',
          external_id: 'file-1',
          display_path: '/Doc.md',
          title: 'Doc',
          snippet: 'hello world',
          matched_chunks: [{ chunk_id: 'chunk-1', chunk_index: 0 }],
          metadata: null,
        },
      ],
      total: 1,
    });
    const client = {
      searchSources,
    } as unknown as MemoxClient;
    const service = new MemoxSearchAdapterService(
      client,
      new MemoxSourceBridgeService(),
    );

    const result = await service.searchFiles({
      userId: 'user-1',
      query: 'hello',
      topK: 5,
      vaultId: 'vault-1',
      requestId: 'req_1',
    });

    expect(searchSources).toHaveBeenCalledWith({
      requestId: 'req_1',
      body: {
        query: 'hello',
        top_k: 5,
        include_graph_context: false,
        user_id: 'user-1',
        project_id: 'vault-1',
      },
    });
    expect(result).toEqual({
      results: [
        {
          fileId: 'file-1',
          vaultId: 'vault-1',
          title: 'Doc',
          path: '/Doc.md',
          snippet: 'hello world',
          score: 0.92,
        },
      ],
      count: 1,
    });
  });
});
