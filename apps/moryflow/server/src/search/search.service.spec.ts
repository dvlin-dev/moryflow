import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchService } from './search.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';
import type { SearchBackendService } from './search-backend.service';
import type { SearchLiveFileProjectorService } from './search-live-file-projector.service';

describe('SearchService', () => {
  let service: SearchService;
  let prismaMock: MockPrismaService;
  let searchBackendMock: {
    searchFiles: ReturnType<typeof vi.fn>;
  };
  let liveProjectorMock: {
    project: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    prismaMock = createPrismaMock();
    (
      prismaMock as unknown as {
        workspace: { findUnique: ReturnType<typeof vi.fn> };
      }
    ).workspace = {
      findUnique: vi.fn().mockResolvedValue({ userId: 'user-1' }),
    };
    searchBackendMock = {
      searchFiles: vi.fn(),
    };
    liveProjectorMock = {
      project: vi.fn(),
    };
    service = new SearchService(
      prismaMock as never,
      searchBackendMock as unknown as SearchBackendService,
      liveProjectorMock as unknown as SearchLiveFileProjectorService,
    );
  });

  it('delegates backend selection and live projection to dedicated services', async () => {
    searchBackendMock.searchFiles.mockResolvedValue({
      results: [
        {
          documentId: 'doc-live',
          workspaceId: 'workspace-1',
          title: 'Raw title',
          path: '/Raw.md',
          snippet: 'Live snippet',
          score: 0.9,
        },
      ],
      count: 1,
    });
    liveProjectorMock.project.mockResolvedValue([
      {
        documentId: 'doc-live',
        workspaceId: 'workspace-1',
        title: 'Live',
        path: '/Live.md',
        snippet: 'Live snippet',
        score: 0.9,
      },
    ]);

    const result = await service.search('user-1', {
      query: 'hello',
      topK: 10,
      workspaceId: 'workspace-1',
    });

    expect(searchBackendMock.searchFiles).toHaveBeenCalledWith({
      userId: 'user-1',
      query: 'hello',
      topK: 10,
      workspaceId: 'workspace-1',
    });
    expect(liveProjectorMock.project).toHaveBeenCalledWith({
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
      ],
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

  it('throws NotFoundException when the workspace does not belong to the current user', async () => {
    (
      prismaMock as unknown as {
        workspace: { findUnique: ReturnType<typeof vi.fn> };
      }
    ).workspace.findUnique.mockResolvedValue({
      userId: 'user-2',
    });

    await expect(
      service.search('user-1', {
        query: 'hello',
        topK: 10,
        workspaceId: 'workspace-1',
      }),
    ).rejects.toThrow('Workspace not found');

    expect(searchBackendMock.searchFiles).not.toHaveBeenCalled();
    expect(liveProjectorMock.project).not.toHaveBeenCalled();
  });
});
