import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchBackendService } from './search-backend.service';
import type {
  LegacyVectorSearchClient,
  MemoxRuntimeConfigService,
  MemoxSearchAdapterService,
} from '../memox';

describe('SearchBackendService', () => {
  let service: SearchBackendService;
  let memoxSearchAdapterMock: {
    searchFiles: ReturnType<typeof vi.fn>;
  };
  let legacyVectorSearchClientMock: {
    query: ReturnType<typeof vi.fn>;
  };
  let memoxRuntimeConfigMock: {
    getSearchBackend: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    memoxSearchAdapterMock = {
      searchFiles: vi.fn(),
    };
    legacyVectorSearchClientMock = {
      query: vi.fn(),
    };
    memoxRuntimeConfigMock = {
      getSearchBackend: vi.fn().mockReturnValue('memox'),
    };
    service = new SearchBackendService(
      memoxSearchAdapterMock as unknown as MemoxSearchAdapterService,
      legacyVectorSearchClientMock as unknown as LegacyVectorSearchClient,
      memoxRuntimeConfigMock as unknown as MemoxRuntimeConfigService,
    );
  });

  it('uses Memox as the default backend', async () => {
    memoxSearchAdapterMock.searchFiles.mockResolvedValue({
      results: [
        {
          fileId: 'file-live',
          vaultId: 'vault-1',
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
      vaultId: 'vault-1',
    });

    expect(memoxSearchAdapterMock.searchFiles).toHaveBeenCalledWith({
      userId: 'user-1',
      query: 'hello',
      topK: 10,
      vaultId: 'vault-1',
    });
    expect(legacyVectorSearchClientMock.query).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          fileId: 'file-live',
          vaultId: 'vault-1',
          title: 'Live',
          path: '/Live.md',
          snippet: 'Live snippet',
          score: 0.9,
        },
      ],
      count: 1,
    });
  });

  it('maps legacy vector baseline matches into the file search contract', async () => {
    memoxRuntimeConfigMock.getSearchBackend.mockReturnValue(
      'legacy_vector_baseline',
    );
    legacyVectorSearchClientMock.query.mockResolvedValue([
      {
        id: 'file-live',
        score: 0.77,
        metadata: {
          title: 'Legacy',
          path: '/Legacy.md',
          vaultId: 'vault-1',
          snippet: 'legacy snippet',
        },
      },
    ]);

    const result = await service.searchFiles({
      userId: 'user-1',
      query: 'legacy',
      topK: 5,
      vaultId: 'vault-1',
    });

    expect(memoxSearchAdapterMock.searchFiles).not.toHaveBeenCalled();
    expect(legacyVectorSearchClientMock.query).toHaveBeenCalledWith(
      'user-1',
      'legacy',
      {
        topK: 5,
        namespace: 'user:user-1',
        filter: {
          vaultId: 'vault-1',
        },
      },
    );
    expect(result).toEqual({
      results: [
        {
          fileId: 'file-live',
          vaultId: 'vault-1',
          title: 'Legacy',
          path: '/Legacy.md',
          snippet: 'legacy snippet',
          score: 0.77,
        },
      ],
      count: 1,
    });
  });
});
