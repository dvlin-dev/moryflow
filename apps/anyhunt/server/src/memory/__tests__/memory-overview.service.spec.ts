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
});
