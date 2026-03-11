import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VectorPrismaService } from '../../vector-prisma';
import { GraphOverviewService } from '../graph-overview.service';

describe('GraphOverviewService', () => {
  let vectorPrisma: any;
  let service: GraphOverviewService;

  beforeEach(() => {
    vectorPrisma = {
      $queryRaw: vi.fn(),
      knowledgeSource: {
        count: vi.fn().mockResolvedValue(2),
      },
      memoryFact: {
        count: vi.fn().mockResolvedValue(1),
      },
      graphObservation: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ graphEntityId: 'entity-1' }])
          .mockResolvedValueOnce([{ graphRelationId: 'relation-1' }]),
        count: vi.fn().mockResolvedValue(7),
        findFirst: vi.fn().mockResolvedValue({
          createdAt: new Date('2026-03-11T07:30:00.000Z'),
        }),
      },
    };

    service = new GraphOverviewService(
      vectorPrisma as unknown as VectorPrismaService,
    );
  });

  it('returns graph counts and latest projection timestamp', async () => {
    const result = await service.getOverview('api-key-1', {
      project_id: 'project-1',
    });

    expect(vectorPrisma.graphObservation.findMany).toHaveBeenNthCalledWith(1, {
      where: expect.objectContaining({
        graphEntityId: { not: null },
        OR: [
          {
            evidenceSource: {
              is: expect.objectContaining({
                apiKeyId: 'api-key-1',
                projectId: 'project-1',
                status: { not: 'DELETED' },
              }),
            },
          },
          {
            evidenceMemory: {
              is: expect.objectContaining({
                apiKeyId: 'api-key-1',
                projectId: 'project-1',
                OR: [
                  { expirationDate: null },
                  { expirationDate: { gt: expect.any(Date) } },
                ],
              }),
            },
          },
        ],
      }),
      distinct: ['graphEntityId'],
      select: { graphEntityId: true },
    });
    expect(result).toEqual({
      entity_count: 1,
      relation_count: 1,
      observation_count: 7,
      projection_status: 'ready',
      last_projected_at: '2026-03-11T07:30:00.000Z',
    });
  });

  it('treats derived facts as building signal before graph observations are ready', async () => {
    vectorPrisma.knowledgeSource.count.mockResolvedValueOnce(0);
    vectorPrisma.memoryFact.count.mockResolvedValueOnce(3);
    vectorPrisma.graphObservation.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vectorPrisma.graphObservation.count.mockResolvedValueOnce(0);
    vectorPrisma.graphObservation.findFirst.mockResolvedValueOnce(null);

    const result = await service.getOverview('api-key-1', {
      project_id: 'project-1',
    });

    expect(result.projection_status).toBe('building');
  });

  it('uses metadata containment for overview scope counts and graph observations', async () => {
    vectorPrisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'source-metadata-1' }])
      .mockResolvedValueOnce([{ id: 'memory-metadata-1' }])
      .mockResolvedValueOnce([{ count: BigInt(4) }])
      .mockResolvedValueOnce([{ count: BigInt(2) }]);

    await service.getOverview('api-key-1', {
      metadata: {
        workspaceId: 'ws-1',
      },
    });

    expect(vectorPrisma.graphObservation.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        apiKeyId: 'api-key-1',
        OR: [
          { evidenceSourceId: { in: ['source-metadata-1'] } },
          { evidenceMemoryId: { in: ['memory-metadata-1'] } },
        ],
        graphEntityId: { not: null },
      },
      distinct: ['graphEntityId'],
      select: { graphEntityId: true },
    });
    expect(vectorPrisma.$queryRaw).toHaveBeenCalledTimes(4);
  });
});
