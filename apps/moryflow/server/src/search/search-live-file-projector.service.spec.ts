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

  it('returns early when there are no candidate document ids', async () => {
    const result = await service.project({
      userId: 'user-1',
      results: [],
    });

    expect(prismaMock.workspaceDocument.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('filters stale hits and rehydrates live document fields from workspace truth', async () => {
    prismaMock.workspaceDocument.findMany.mockResolvedValue([
      {
        id: 'doc-live',
        workspaceId: 'workspace-1',
        title: 'Live',
        path: '/Live.md',
      },
    ]);

    const result = await service.project({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      results: [
        {
          documentId: 'doc-live',
          workspaceId: 'workspace-1',
          title: 'Raw title',
          path: '/Raw.md',
          snippet: 'Live snippet',
          score: 0.9,
        },
        {
          documentId: 'doc-missing',
          workspaceId: 'workspace-1',
          title: 'Deleted',
          path: '/Deleted.md',
          snippet: 'Deleted snippet',
          score: 0.8,
        },
      ],
    });

    expect(prismaMock.workspaceDocument.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['doc-live', 'doc-missing'],
        },
        workspace: {
          userId: 'user-1',
        },
        workspaceId: 'workspace-1',
      },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        path: true,
      },
    });
    expect(result).toEqual([
      {
        documentId: 'doc-live',
        workspaceId: 'workspace-1',
        title: 'Live',
        path: '/Live.md',
        snippet: 'Live snippet',
        score: 0.9,
      },
    ]);
  });
});
