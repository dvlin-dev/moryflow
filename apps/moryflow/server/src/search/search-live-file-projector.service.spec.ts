import { beforeEach, describe, expect, it } from 'vitest';
import { SearchLiveFileProjectorService } from './search-live-file-projector.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('SearchLiveFileProjectorService', () => {
  let service: SearchLiveFileProjectorService;
  let prismaMock: MockPrismaService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new SearchLiveFileProjectorService(prismaMock as never);
  });

  it('returns early when there are no candidate file ids', async () => {
    const result = await service.project({
      userId: 'user-1',
      results: [],
    });

    expect(prismaMock.syncFile.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('filters stale hits and rehydrates live file fields from sync truth', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-live',
        vaultId: 'vault-1',
        title: 'Live',
        path: '/Live.md',
      },
    ]);

    const result = await service.project({
      userId: 'user-1',
      vaultId: 'vault-1',
      results: [
        {
          fileId: 'file-live',
          vaultId: 'vault-1',
          title: 'Raw title',
          path: '/Raw.md',
          snippet: 'Live snippet',
          score: 0.9,
        },
        {
          fileId: 'file-deleted',
          vaultId: 'vault-1',
          title: 'Deleted',
          path: '/Deleted.md',
          snippet: 'Deleted snippet',
          score: 0.8,
        },
      ],
    });

    expect(prismaMock.syncFile.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['file-live', 'file-deleted'],
        },
        isDeleted: false,
        vault: {
          userId: 'user-1',
        },
        vaultId: 'vault-1',
      },
      select: {
        id: true,
        vaultId: true,
        title: true,
        path: true,
      },
    });
    expect(result).toEqual([
      {
        fileId: 'file-live',
        vaultId: 'vault-1',
        title: 'Live',
        path: '/Live.md',
        snippet: 'Live snippet',
        score: 0.9,
      },
    ]);
  });
});
