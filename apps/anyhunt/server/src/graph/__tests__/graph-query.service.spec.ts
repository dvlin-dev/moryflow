import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { VectorPrismaService } from '../../vector-prisma';
import { GraphQueryService } from '../graph-query.service';
import type { GraphScopeService } from '../graph-scope.service';

describe('GraphQueryService', () => {
  let vectorPrisma: any;
  let graphScopeService: { requireScope: ReturnType<typeof vi.fn> };
  let service: GraphQueryService;

  beforeEach(() => {
    vectorPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'entity-1' }]),
      graphEntity: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'entity-1',
            entityType: 'person',
            canonicalName: 'Alice',
            aliases: ['A'],
            metadata: null,
            lastSeenAt: new Date('2026-03-11T01:00:00.000Z'),
          },
        ]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'entity-1',
          entityType: 'person',
          canonicalName: 'Alice',
          aliases: ['A'],
          metadata: null,
          lastSeenAt: new Date('2026-03-11T01:00:00.000Z'),
          incomingRelations: [],
          outgoingRelations: [
            {
              id: 'relation-1',
              relationType: 'works_on',
              confidence: 0.9,
              fromEntity: {
                id: 'entity-1',
                entityType: 'person',
                canonicalName: 'Alice',
                aliases: ['A'],
              },
              toEntity: {
                id: 'entity-2',
                entityType: 'project',
                canonicalName: 'Memox',
                aliases: [],
              },
            },
          ],
          observations: [
            {
              id: 'observation-1',
              graphRelationId: 'relation-1',
              observationType: 'MEMORY_ENTITY',
              confidence: 0.91,
              evidenceSourceId: 'source-1',
              evidenceRevisionId: 'revision-1',
              evidenceChunkId: null,
              evidenceMemoryId: 'memory-1',
              payload: { snippet: 'Alice works on Memox' },
              createdAt: new Date('2026-03-11T02:00:00.000Z'),
            },
          ],
        }),
      },
      graphRelation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'relation-1',
            relationType: 'works_on',
            confidence: 0.9,
            fromEntity: {
              id: 'entity-1',
              entityType: 'person',
              canonicalName: 'Alice',
              aliases: ['A'],
            },
            toEntity: {
              id: 'entity-2',
              entityType: 'project',
              canonicalName: 'Memox',
              aliases: [],
            },
          },
        ]),
      },
      graphObservation: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ evidenceSourceId: 'source-1' }])
          .mockResolvedValueOnce([{ evidenceMemoryId: 'memory-1' }])
          .mockResolvedValueOnce([{ evidenceSourceId: 'source-1' }])
          .mockResolvedValueOnce([{ evidenceMemoryId: 'memory-1' }]),
        count: vi.fn().mockResolvedValue(21),
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            createdAt: new Date('2026-03-11T03:00:00.000Z'),
          })
          .mockResolvedValueOnce({
            createdAt: new Date('2026-03-11T02:00:00.000Z'),
          }),
      },
    };

    graphScopeService = {
      requireScope: vi.fn().mockResolvedValue({
        id: 'graph-scope-1',
        apiKeyId: 'api-key-1',
        projectId: 'project-1',
      }),
    };

    service = new GraphQueryService(
      vectorPrisma as unknown as VectorPrismaService,
      graphScopeService as unknown as GraphScopeService,
    );
  });

  it('queries graph inside a required graph scope', async () => {
    const result = await service.query('api-key-1', {
      query: 'alice',
      limit: 10,
      entity_types: ['person'],
      relation_types: ['works_on'],
      scope: {
        project_id: 'project-1',
      },
    });

    expect(graphScopeService.requireScope).toHaveBeenCalledWith(
      'api-key-1',
      'project-1',
    );
    expect(vectorPrisma.graphEntity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          graphScopeId: 'graph-scope-1',
          entityType: { in: ['person'] },
        }),
      }),
    );
    expect(vectorPrisma.graphRelation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          graphScopeId: 'graph-scope-1',
          relationType: { in: ['works_on'] },
        }),
      }),
    );
    expect(result).toEqual({
      entities: [
        {
          id: 'entity-1',
          entity_type: 'person',
          canonical_name: 'Alice',
          aliases: ['A'],
          metadata: null,
          last_seen_at: '2026-03-11T01:00:00.000Z',
        },
      ],
      relations: [
        {
          id: 'relation-1',
          relation_type: 'works_on',
          confidence: 0.9,
          from: {
            id: 'entity-1',
            entity_type: 'person',
            canonical_name: 'Alice',
            aliases: ['A'],
          },
          to: {
            id: 'entity-2',
            entity_type: 'project',
            canonical_name: 'Memox',
            aliases: [],
          },
        },
      ],
      evidence_summary: {
        observation_count: 21,
        source_count: 1,
        memory_fact_count: 1,
        latest_observed_at: '2026-03-11T03:00:00.000Z',
      },
    });
    expect(vectorPrisma.$queryRaw).toHaveBeenCalled();
  });

  it('returns entity detail inside a required graph scope', async () => {
    const result = await service.getEntityDetail('api-key-1', 'entity-1', {
      project_id: 'project-1',
    });

    expect(vectorPrisma.graphEntity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          graphScopeId: 'graph-scope-1',
          id: 'entity-1',
        },
      }),
    );
    expect(result.entity.outgoing_relations).toHaveLength(1);
    expect(result.evidence_summary).toEqual({
      observation_count: 21,
      source_count: 1,
      memory_fact_count: 1,
      latest_observed_at: '2026-03-11T03:00:00.000Z',
    });
    expect(result.recent_observations[0]).toMatchObject({
      id: 'observation-1',
      observation_type: 'MEMORY_ENTITY',
      evidence_source_id: 'source-1',
      evidence_memory_id: 'memory-1',
    });
  });

  it('throws when entity detail is missing inside scope', async () => {
    vectorPrisma.graphEntity.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.getEntityDetail('api-key-1', 'missing', {
        project_id: 'project-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
