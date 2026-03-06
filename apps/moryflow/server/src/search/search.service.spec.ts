import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService } from './search.service';
import { SearchResultFilterService } from './search-result-filter.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';
import { VectorizeClient } from '../vectorize';

describe('SearchService', () => {
  let service: SearchService;
  let prismaMock: MockPrismaService;
  let vectorizeClientMock: {
    query: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    prismaMock = createPrismaMock();
    (
      prismaMock as unknown as {
        vault: { findUnique: ReturnType<typeof vi.fn> };
      }
    ).vault = {
      findUnique: vi.fn().mockResolvedValue({ userId: 'user-1' }),
    };
    vectorizeClientMock = {
      query: vi.fn(),
    };
    service = new SearchService(
      prismaMock as never,
      vectorizeClientMock as unknown as VectorizeClient,
      new SearchResultFilterService(prismaMock as never),
    );
  });

  it('filters out deleted or missing sync files from search results', async () => {
    vectorizeClientMock.query.mockResolvedValue([
      {
        id: 'file-live',
        score: 0.9,
        metadata: { title: 'Live' },
      },
      {
        id: 'file-deleted',
        score: 0.8,
        metadata: { title: 'Deleted' },
      },
      {
        id: 'file-missing',
        score: 0.7,
        metadata: { title: 'Missing' },
      },
    ]);
    prismaMock.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-live',
        vaultId: 'vault-1',
        isDeleted: false,
      },
      {
        id: 'file-deleted',
        vaultId: 'vault-1',
        isDeleted: true,
      },
    ]);

    const result = await service.search('user-1', {
      query: 'hello',
      topK: 10,
      vaultId: 'vault-1',
    });

    expect(result.results).toEqual([
      {
        fileId: 'file-live',
        score: 0.9,
        title: 'Live',
      },
    ]);
  });
});
