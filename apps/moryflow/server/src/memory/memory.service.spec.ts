import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MemoryService } from './memory.service';
import type { MemoryClient } from './memory.client';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

type MemoryClientMock = {
  getOverview: ReturnType<typeof vi.fn>;
  createMemory: ReturnType<typeof vi.fn>;
  getMemoryById: ReturnType<typeof vi.fn>;
  updateMemory: ReturnType<typeof vi.fn>;
};

describe('MemoryService', () => {
  let prismaMock: MockPrismaService;
  let memoryClientMock: MemoryClientMock;
  let service: MemoryService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'user-1',
      syncVault: {
        id: 'vault-1',
      },
    });

    memoryClientMock = {
      getOverview: vi.fn(),
      createMemory: vi.fn(),
      getMemoryById: vi.fn(),
      updateMemory: vi.fn(),
    };

    service = new MemoryService(
      prismaMock as never,
      memoryClientMock as unknown as MemoryClient,
    );
  });

  it('resolves workspace scope and returns overview with sync transport metadata', async () => {
    memoryClientMock.getOverview.mockResolvedValue({
      indexing: {
        source_count: 2,
        indexed_source_count: 2,
        pending_source_count: 0,
        failed_source_count: 0,
        last_indexed_at: null,
      },
      facts: {
        manual_count: 1,
        derived_count: 3,
      },
      graph: {
        entity_count: 4,
        relation_count: 5,
        projection_status: 'ready',
        last_projected_at: null,
      },
    });

    const result = await service.getOverview('user-1', {
      workspaceId: 'workspace-1',
    });

    expect(prismaMock.workspace.findUnique).toHaveBeenCalledWith({
      where: { id: 'workspace-1' },
      select: {
        id: true,
        userId: true,
        syncVault: {
          select: {
            id: true,
          },
        },
      },
    });
    expect(memoryClientMock.getOverview).toHaveBeenCalledWith({
      userId: 'user-1',
      projectId: 'workspace-1',
    });
    expect(result.scope).toEqual({
      workspaceId: 'workspace-1',
      projectId: 'workspace-1',
      syncVaultId: 'vault-1',
    });
  });

  it('creates manual facts under workspace project scope', async () => {
    memoryClientMock.createMemory.mockResolvedValue([{ id: 'fact-1' }]);
    memoryClientMock.getMemoryById.mockResolvedValue({
      id: 'fact-1',
      content: 'remember alpha',
      metadata: null,
      categories: [],
      immutable: false,
      origin_kind: 'MANUAL',
      source_id: null,
      source_revision_id: null,
      derived_key: null,
      expiration_date: null,
      user_id: 'user-1',
      project_id: 'workspace-1',
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
    });

    const result = await service.createFact('user-1', {
      workspaceId: 'workspace-1',
      text: 'remember alpha',
      categories: ['project'],
    });

    expect(memoryClientMock.createMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        project_id: 'workspace-1',
        messages: [{ role: 'user', content: 'remember alpha' }],
        custom_categories: {
          project: true,
        },
      }),
    );
    expect(result.id).toBe('fact-1');
    expect(result.kind).toBe('manual');
  });

  it('rejects updates to derived facts even when the workspace matches', async () => {
    memoryClientMock.getMemoryById.mockResolvedValue({
      id: 'fact-2',
      content: 'derived fact',
      metadata: null,
      categories: [],
      immutable: true,
      origin_kind: 'SOURCE_DERIVED',
      source_id: 'source-1',
      source_revision_id: 'revision-1',
      derived_key: null,
      expiration_date: null,
      user_id: 'user-1',
      project_id: 'workspace-1',
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
    });

    await expect(
      service.updateFact('user-1', 'fact-2', {
        workspaceId: 'workspace-1',
        text: 'updated',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(memoryClientMock.updateMemory).not.toHaveBeenCalled();
  });

  it('throws when the workspace does not belong to the current user', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(null);

    await expect(
      service.getOverview('user-1', {
        workspaceId: 'workspace-missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(memoryClientMock.getOverview).not.toHaveBeenCalled();
  });
});
