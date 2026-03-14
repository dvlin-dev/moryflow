import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchBackendService } from './search-backend.service';
import type { MemoxSearchAdapterService } from '../memox';

describe('SearchBackendService', () => {
  let service: SearchBackendService;
  let memoxSearchAdapterMock: {
    searchFiles: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    memoxSearchAdapterMock = {
      searchFiles: vi.fn(),
    };
    service = new SearchBackendService(
      memoxSearchAdapterMock as unknown as MemoxSearchAdapterService,
    );
  });

  it('always delegates file search to Memox', async () => {
    memoxSearchAdapterMock.searchFiles.mockResolvedValue({
      results: [
        {
          documentId: 'doc-live',
          workspaceId: 'workspace-1',
          title: 'Live',
          path: '/Live.md',
          snippet: 'Live snippet',
          score: 0.9,
        },
      ],
      count: 1,
    });

    const result = await service.searchFiles({
      userId: 'user-1',
      query: 'hello',
      topK: 10,
      workspaceId: 'workspace-1',
    });

    expect(memoxSearchAdapterMock.searchFiles).toHaveBeenCalledWith({
      userId: 'user-1',
      query: 'hello',
      topK: 10,
      workspaceId: 'workspace-1',
    });
    expect(result).toEqual({
      results: [
        {
          documentId: 'doc-live',
          workspaceId: 'workspace-1',
          title: 'Live',
          path: '/Live.md',
          snippet: 'Live snippet',
          score: 0.9,
        },
      ],
      count: 1,
    });
  });
});
