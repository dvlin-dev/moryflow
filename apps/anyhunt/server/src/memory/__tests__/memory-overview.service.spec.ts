import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VectorPrismaService } from '../../vector-prisma';
import type { GraphScopeService } from '../../graph/graph-scope.service';
import type { SourceIngestReadService } from '../../sources/source-ingest-read.service';
import { MemoryOverviewService } from '../memory-overview.service';

describe('MemoryOverviewService', () => {
  let vectorPrisma: any;
  let graphScopeService: { getScope: ReturnType<typeof vi.fn> };
  let sourceIngestReadService: { getOverview: ReturnType<typeof vi.fn> };
  let service: MemoryOverviewService;

  beforeEach(() => {
    vectorPrisma = {
      $queryRaw: vi.fn(),
      memoryFact: {
        count: vi.fn(),
      },
      graphObservation: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    graphScopeService = {
      getScope: vi.fn(),
    };
    sourceIngestReadService = {
      getOverview: vi.fn().mockResolvedValue({
        sourceCount: 12,
        indexedSourceCount: 8,
        indexingSourceCount: 3,
        attentionSourceCount: 1,
        lastIndexedAt: '2026-03-11T06:00:00.000Z',
      }),
    };

    service = new MemoryOverviewService(
      vectorPrisma as unknown as VectorPrismaService,
      graphScopeService as unknown as GraphScopeService,
      sourceIngestReadService as unknown as SourceIngestReadService,
    );
  });

  it('returns indexing and facts overview with disabled graph when scope is absent', async () => {
    graphScopeService.getScope.mockResolvedValueOnce(null);
    vectorPrisma.$queryRaw.mockResolvedValueOnce([
      { manualCount: BigInt(5), derivedCount: BigInt(17) },
    ]);

    await expect(
      service.getOverview('api-key-1', {
        project_id: 'project-1',
      }),
    ).resolves.toEqual({
      indexing: {
        source_count: 12,
        indexed_source_count: 8,
        indexing_source_count: 3,
        attention_source_count: 1,
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

    expect(vectorPrisma.memoryFact.count).not.toHaveBeenCalled();
  });

  it('returns graph overview from graph scope state when scope exists', async () => {
    graphScopeService.getScope.mockResolvedValueOnce({
      id: 'graph-scope-1',
      projectionStatus: 'READY',
      lastProjectedAt: new Date('2026-03-11T06:30:00.000Z'),
    });
    vectorPrisma.$queryRaw
      .mockResolvedValueOnce([
        { manualCount: BigInt(5), derivedCount: BigInt(17) },
      ])
      .mockResolvedValueOnce([
        {
          entityCount: BigInt(1),
          relationCount: BigInt(1),
          observationCount: BigInt(4),
        },
      ]);

    await expect(
      service.getOverview('api-key-1', {
        project_id: 'project-1',
      }),
    ).resolves.toEqual({
      indexing: {
        source_count: 12,
        indexed_source_count: 8,
        indexing_source_count: 3,
        attention_source_count: 1,
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

    expect(vectorPrisma.graphObservation.findMany).not.toHaveBeenCalled();
  });

  it('returns idle graph when scope is marked ready but no observations remain', async () => {
    graphScopeService.getScope.mockResolvedValueOnce({
      id: 'graph-scope-1',
      projectionStatus: 'READY',
      lastProjectedAt: new Date('2026-03-11T06:30:00.000Z'),
    });
    vectorPrisma.$queryRaw
      .mockResolvedValueOnce([
        { manualCount: BigInt(5), derivedCount: BigInt(17) },
      ])
      .mockResolvedValueOnce([
        {
          entityCount: BigInt(0),
          relationCount: BigInt(0),
          observationCount: BigInt(0),
        },
      ]);

    await expect(
      service.getOverview('api-key-1', {
        project_id: 'project-1',
      }),
    ).resolves.toEqual({
      indexing: {
        source_count: 12,
        indexed_source_count: 8,
        indexing_source_count: 3,
        attention_source_count: 1,
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

  it('delegates source indexing summary to the ingest read service', async () => {
    graphScopeService.getScope.mockResolvedValueOnce(null);
    vectorPrisma.$queryRaw.mockResolvedValueOnce([
      { manualCount: BigInt(0), derivedCount: BigInt(0) },
    ]);

    await service.getOverview('api-key-1', {
      project_id: 'project-1',
    });

    expect(sourceIngestReadService.getOverview).toHaveBeenCalledWith(
      'api-key-1',
      {
        project_id: 'project-1',
      },
    );
  });

  it('builds graph overview from aggregated SQL instead of loading distinct rows', async () => {
    graphScopeService.getScope.mockResolvedValueOnce({
      id: 'graph-scope-1',
      projectionStatus: 'FAILED',
      lastProjectedAt: new Date('2026-03-11T06:30:00.000Z'),
    });
    vectorPrisma.$queryRaw
      .mockResolvedValueOnce([
        { manualCount: BigInt(0), derivedCount: BigInt(0) },
      ])
      .mockResolvedValueOnce([
        {
          entityCount: BigInt(2),
          relationCount: BigInt(3),
          observationCount: BigInt(4),
        },
      ]);

    await service.getOverview('api-key-1', {
      project_id: 'project-1',
    });

    const graphSql = vectorPrisma.$queryRaw.mock.calls[1]?.[0]?.sql ?? '';
    expect(graphSql).toContain(`COUNT(DISTINCT "graphEntityId")`);
    expect(graphSql).toContain(`COUNT(DISTINCT "graphRelationId")`);
    expect(vectorPrisma.graphObservation.findMany).not.toHaveBeenCalled();
  });
});
