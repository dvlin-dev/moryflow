import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VectorPrismaService } from '../../vector-prisma';
import { MemoryOverviewService } from '../memory-overview.service';

describe('MemoryOverviewService', () => {
  let vectorPrisma: any;
  let service: MemoryOverviewService;

  beforeEach(() => {
    vectorPrisma = {
      knowledgeSource: {
        count: vi
          .fn()
          .mockResolvedValueOnce(12)
          .mockResolvedValueOnce(8)
          .mockResolvedValueOnce(1),
        findMany: vi.fn().mockResolvedValue([{ id: 'source-1' }]),
      },
      knowledgeSourceRevision: {
        findMany: vi.fn().mockResolvedValue([{ sourceId: 'source-2' }]),
        findFirst: vi.fn().mockResolvedValue({
          indexedAt: new Date('2026-03-11T06:00:00.000Z'),
        }),
      },
      memoryFact: {
        count: vi.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(17),
        findMany: vi.fn().mockResolvedValue([{ id: 'memory-1' }]),
      },
      graphObservation: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ graphEntityId: 'entity-1' }])
          .mockResolvedValueOnce([{ graphRelationId: 'relation-1' }]),
        count: vi.fn().mockResolvedValue(4),
        findFirst: vi.fn().mockResolvedValue({
          createdAt: new Date('2026-03-11T06:30:00.000Z'),
        }),
      },
    };

    service = new MemoryOverviewService(
      vectorPrisma as unknown as VectorPrismaService,
    );
  });

  it('returns one-shot overview stats for indexing, facts and graph', async () => {
    const result = await service.getOverview('api-key-1', {
      project_id: 'project-1',
    });

    expect(result).toEqual({
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

    expect(vectorPrisma.memoryFact.count).toHaveBeenNthCalledWith(1, {
      where: {
        apiKeyId: 'api-key-1',
        projectId: 'project-1',
        originKind: 'MANUAL',
        OR: [
          { expirationDate: null },
          { expirationDate: { gt: expect.any(Date) } },
        ],
      },
    });
    expect(vectorPrisma.memoryFact.count).toHaveBeenNthCalledWith(2, {
      where: {
        apiKeyId: 'api-key-1',
        projectId: 'project-1',
        originKind: 'SOURCE_DERIVED',
        OR: [
          { expirationDate: null },
          { expirationDate: { gt: expect.any(Date) } },
        ],
      },
    });
  });
});
