import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VectorPrismaService } from '../../vector-prisma';
import type { GraphScopeService } from '../../graph/graph-scope.service';
import { MemoryOverviewService } from '../memory-overview.service';

describe('MemoryOverviewService', () => {
  let vectorPrisma: any;
  let graphScopeService: { getScope: ReturnType<typeof vi.fn> };
  let service: MemoryOverviewService;

  beforeEach(() => {
    vectorPrisma = {
      $queryRaw: vi.fn(),
      knowledgeSource: {
        count: vi
          .fn()
          .mockResolvedValueOnce(12)
          .mockResolvedValueOnce(8)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(1),
      },
      knowledgeSourceRevision: {
        findFirst: vi.fn().mockResolvedValue({
          updatedAt: new Date('2026-03-11T06:00:00.000Z'),
        }),
      },
      memoryFact: {
        count: vi.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(17),
      },
      graphObservation: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ graphEntityId: 'entity-1' }])
          .mockResolvedValueOnce([{ graphRelationId: 'relation-1' }]),
        count: vi.fn().mockResolvedValue(4),
      },
    };

    graphScopeService = {
      getScope: vi.fn(),
    };

    service = new MemoryOverviewService(
      vectorPrisma as unknown as VectorPrismaService,
      graphScopeService as unknown as GraphScopeService,
    );
  });

  it('returns indexing and facts overview with disabled graph when scope is absent', async () => {
    graphScopeService.getScope.mockResolvedValueOnce(null);

    await expect(
      service.getOverview('api-key-1', {
        project_id: 'project-1',
      }),
    ).resolves.toEqual({
      indexing: {
        source_count: 12,
        indexed_source_count: 8,
        pending_source_count: 1,
        failed_source_count: 1,
        last_indexed_at: '2026-03-11T06:00:00.000Z',
      },
      facts: {
        manual_count: 5,
        derived_count: 17,
      },
      graph: {
        entity_count: 0,
        relation_count: 0,
        projection_status: 'disabled',
        last_projected_at: null,
      },
    });
  });

  it('returns graph overview from graph scope state when scope exists', async () => {
    graphScopeService.getScope.mockResolvedValueOnce({
      id: 'graph-scope-1',
      projectionStatus: 'READY',
      lastProjectedAt: new Date('2026-03-11T06:30:00.000Z'),
    });

    await expect(
      service.getOverview('api-key-1', {
        project_id: 'project-1',
      }),
    ).resolves.toEqual({
      indexing: {
        source_count: 12,
        indexed_source_count: 8,
        pending_source_count: 1,
        failed_source_count: 1,
        last_indexed_at: '2026-03-11T06:00:00.000Z',
      },
      facts: {
        manual_count: 5,
        derived_count: 17,
      },
      graph: {
        entity_count: 1,
        relation_count: 1,
        projection_status: 'ready',
        last_projected_at: '2026-03-11T06:30:00.000Z',
      },
    });
  });

  it('returns idle graph when scope is marked ready but no observations remain', async () => {
    graphScopeService.getScope.mockResolvedValueOnce({
      id: 'graph-scope-1',
      projectionStatus: 'READY',
      lastProjectedAt: new Date('2026-03-11T06:30:00.000Z'),
    });
    vectorPrisma.graphObservation.findMany = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vectorPrisma.graphObservation.count = vi.fn().mockResolvedValueOnce(0);

    await expect(
      service.getOverview('api-key-1', {
        project_id: 'project-1',
      }),
    ).resolves.toEqual({
      indexing: {
        source_count: 12,
        indexed_source_count: 8,
        pending_source_count: 1,
        failed_source_count: 1,
        last_indexed_at: '2026-03-11T06:00:00.000Z',
      },
      facts: {
        manual_count: 5,
        derived_count: 17,
      },
      graph: {
        entity_count: 0,
        relation_count: 0,
        projection_status: 'idle',
        last_projected_at: '2026-03-11T06:30:00.000Z',
      },
    });
  });

  it('counts indexed sources as ACTIVE only in the Prisma path', async () => {
    graphScopeService.getScope.mockResolvedValueOnce(null);

    await service.getOverview('api-key-1', {
      project_id: 'project-1',
    });

    expect(vectorPrisma.knowledgeSource.count).toHaveBeenNthCalledWith(2, {
      where: {
        apiKeyId: 'api-key-1',
        status: 'ACTIVE',
        currentRevisionId: { not: null },
        projectId: 'project-1',
      },
    });
  });

  it('adds ACTIVE status to indexed source SQL in the metadata path', async () => {
    graphScopeService.getScope.mockResolvedValueOnce(null);
    vectorPrisma.$queryRaw = vi
      .fn()
      .mockResolvedValueOnce([{ count: BigInt(12) }])
      .mockResolvedValueOnce([{ count: BigInt(8) }])
      .mockResolvedValueOnce([{ count: BigInt(1) }])
      .mockResolvedValueOnce([{ count: BigInt(1) }])
      .mockResolvedValueOnce([
        { updatedAt: new Date('2026-03-11T06:00:00.000Z') },
      ])
      .mockResolvedValueOnce([{ count: BigInt(5) }])
      .mockResolvedValueOnce([{ count: BigInt(17) }]);

    await service.getOverview('api-key-1', {
      project_id: 'project-1',
      metadata: {
        source_origin: 'moryflow_sync',
      },
    });

    const indexedSql = vectorPrisma.$queryRaw.mock.calls[1]?.[0]?.sql ?? '';
    expect(indexedSql).toContain(`s."currentRevisionId" IS NOT NULL`);
    expect(indexedSql).toContain(`s.status = 'ACTIVE'`);
  });
});
