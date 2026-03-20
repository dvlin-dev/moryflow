import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VectorPrismaService } from '../../vector-prisma';
import type { GraphScopeService } from '../graph-scope.service';
import { GraphOverviewService } from '../graph-overview.service';

describe('GraphOverviewService', () => {
  let vectorPrisma: any;
  let graphScopeService: { getScope: ReturnType<typeof vi.fn> };
  let service: GraphOverviewService;

  beforeEach(() => {
    vectorPrisma = {
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

    service = new GraphOverviewService(
      vectorPrisma as unknown as VectorPrismaService,
      graphScopeService as unknown as GraphScopeService,
    );
  });

  it('returns disabled when graph scope is not provisioned', async () => {
    graphScopeService.getScope.mockResolvedValueOnce(null);

    await expect(
      service.getOverview('api-key-1', { project_id: 'project-1' }),
    ).resolves.toEqual({
      entity_count: 0,
      relation_count: 0,
      observation_count: 0,
      projection_status: 'disabled',
      last_projected_at: null,
    });
    expect(vectorPrisma.graphObservation.findMany).not.toHaveBeenCalled();
  });

  it('summarizes graph rows inside graph scope', async () => {
    graphScopeService.getScope.mockResolvedValueOnce({
      id: 'graph-scope-1',
      projectionStatus: 'READY',
      lastProjectedAt: new Date('2026-03-11T06:30:00.000Z'),
    });

    await expect(
      service.getOverview('api-key-1', { project_id: 'project-1' }),
    ).resolves.toEqual({
      entity_count: 1,
      relation_count: 1,
      observation_count: 4,
      projection_status: 'ready',
      last_projected_at: '2026-03-11T06:30:00.000Z',
    });
  });

  it('returns idle when scope is marked ready but no graph observations remain', async () => {
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
      service.getOverview('api-key-1', { project_id: 'project-1' }),
    ).resolves.toEqual({
      entity_count: 0,
      relation_count: 0,
      observation_count: 0,
      projection_status: 'idle',
      last_projected_at: '2026-03-11T06:30:00.000Z',
    });
  });
});
