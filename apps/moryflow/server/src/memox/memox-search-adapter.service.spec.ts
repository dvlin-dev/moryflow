import { describe, expect, it, vi } from 'vitest';
import { MemoxSearchAdapterService } from './memox-search-adapter.service';
import type { MemoxClient } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';

describe('MemoxSearchAdapterService', () => {
  it('maps workspace search to Memox sources/search and returns document-first results', async () => {
    const searchSources = vi.fn().mockResolvedValue({
      results: [
        {
          result_kind: 'source',
          id: 'source-1',
          score: 0.92,
          rank: 1,
          source_id: 'source-1',
          source_type: 'moryflow_workspace_markdown_v1',
          project_id: 'workspace-1',
          external_id: 'document-1',
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
      workspaceId: 'workspace-1',
      requestId: 'req_1',
    });

    expect(searchSources).toHaveBeenCalledWith({
      requestId: 'req_1',
      body: {
        query: 'hello',
        top_k: 5,
        include_graph_context: false,
        source_types: ['moryflow_workspace_markdown_v1'],
        user_id: 'user-1',
        project_id: 'workspace-1',
      },
    });
    expect(result).toEqual({
      results: [
        {
          documentId: 'document-1',
          workspaceId: 'workspace-1',
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
