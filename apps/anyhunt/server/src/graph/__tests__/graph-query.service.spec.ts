import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { VectorPrismaService } from '../../vector-prisma';
import { GraphQueryService } from '../graph-query.service';

describe('GraphQueryService', () => {
  let vectorPrisma: any;
  let service: GraphQueryService;

  beforeEach(() => {
    vectorPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([]),
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
        findMany: vi.fn().mockResolvedValue([
          {
            evidenceSourceId: 'source-1',
            evidenceMemoryId: 'memory-1',
            createdAt: new Date('2026-03-11T03:00:00.000Z'),
          },
        ]),
        count: vi.fn().mockResolvedValue(21),
        findFirst: vi.fn().mockResolvedValue({
          createdAt: new Date('2026-03-11T02:00:00.000Z'),
        }),
      },
    };

    service = new GraphQueryService(
      vectorPrisma as unknown as VectorPrismaService,
    );
  });

  it('queries graph with unified scope-derived evidence filters', async () => {
    vectorPrisma.graphObservation.findFirst.mockResolvedValueOnce({
      createdAt: new Date('2026-03-11T03:00:00.000Z'),
    });

    const result = await service.query('api-key-1', {
      query: 'alice',
      limit: 10,
      entity_types: ['person'],
      relation_types: ['works_on'],
      scope: {
        project_id: 'project-1',
      },
    });

    expect(vectorPrisma.graphEntity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          apiKeyId: 'api-key-1',
          entityType: { in: ['person'] },
          observations: {
            some: {
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
            },
          },
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
    expect(vectorPrisma.$queryRaw).toHaveBeenCalledWith(expect.anything());
  });

  it('returns entity detail with relations and recent observations', async () => {
    const result = await service.getEntityDetail('api-key-1', 'entity-1');
    const scopedResult = await service.getEntityDetail(
      'api-key-1',
      'entity-1',
      {
        project_id: 'project-1',
      },
    );

    expect(result.entity.outgoing_relations).toHaveLength(1);
    expect(scopedResult.entity.outgoing_relations).toHaveLength(1);
    expect(result.evidence_summary).toEqual({
      observation_count: 21,
      source_count: 1,
      memory_fact_count: 1,
      latest_observed_at: '2026-03-11T02:00:00.000Z',
    });
    expect(vectorPrisma.graphObservation.count).toHaveBeenLastCalledWith({
      where: {
        apiKeyId: 'api-key-1',
        AND: expect.arrayContaining([
          expect.any(Object),
          {
            OR: expect.arrayContaining([
              { graphEntityId: { in: ['entity-1'] } },
              { graphRelationId: { in: ['relation-1'] } },
            ]),
          },
        ]),
      },
    });
    expect(result.recent_observations[0]).toMatchObject({
      id: 'observation-1',
      observation_type: 'MEMORY_ENTITY',
      evidence_source_id: 'source-1',
      evidence_memory_id: 'memory-1',
    });
  });

  it('throws when entity detail is missing', async () => {
    vectorPrisma.graphEntity.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.getEntityDetail('api-key-1', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when scoped entity detail has no observations inside scope', async () => {
    vectorPrisma.graphEntity.findFirst.mockResolvedValueOnce({
      id: 'entity-1',
      entityType: 'person',
      canonicalName: 'Alice',
      aliases: ['A'],
      metadata: null,
      lastSeenAt: new Date('2026-03-11T01:00:00.000Z'),
      incomingRelations: [],
      outgoingRelations: [],
      observations: [],
    });

    await expect(
      service.getEntityDetail('api-key-1', 'entity-1', {
        project_id: 'project-missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps scoped relations even when recent observations do not include every relation id', async () => {
    vectorPrisma.graphEntity.findFirst.mockResolvedValueOnce({
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
        {
          id: 'relation-2',
          relationType: 'owns',
          confidence: 0.8,
          fromEntity: {
            id: 'entity-1',
            entityType: 'person',
            canonicalName: 'Alice',
            aliases: ['A'],
          },
          toEntity: {
            id: 'entity-3',
            entityType: 'project',
            canonicalName: 'Atlas',
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
    });

    const result = await service.getEntityDetail('api-key-1', 'entity-1', {
      project_id: 'project-1',
    });

    expect(result.entity.outgoing_relations).toHaveLength(2);
  });

  it('allows scoped entity detail when the entity is only visible through scoped relation evidence', async () => {
    vectorPrisma.graphEntity.findFirst.mockResolvedValueOnce({
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
      observations: [],
    });

    const result = await service.getEntityDetail('api-key-1', 'entity-1', {
      project_id: 'project-1',
    });

    expect(vectorPrisma.graphEntity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            {
              observations: {
                some: expect.any(Object),
              },
            },
            {
              incomingRelations: {
                some: {
                  observations: { some: expect.any(Object) },
                },
              },
            },
            {
              outgoingRelations: {
                some: {
                  observations: { some: expect.any(Object) },
                },
              },
            },
          ],
        }),
      }),
    );
    expect(result.entity.outgoing_relations).toHaveLength(1);
  });

  it('uses metadata containment scope via resolved evidence ids instead of JSON equality', async () => {
    vectorPrisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'source-metadata-1' }])
      .mockResolvedValueOnce([{ id: 'memory-metadata-1' }]);

    await service.query('api-key-1', {
      limit: 5,
      scope: {
        project_id: 'project-1',
        metadata: {
          workspaceId: 'ws-1',
        },
      },
    });

    expect(vectorPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(vectorPrisma.graphEntity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          observations: {
            some: {
              OR: [
                { evidenceSourceId: { in: ['source-metadata-1'] } },
                { evidenceMemoryId: { in: ['memory-metadata-1'] } },
              ],
            },
          },
        }),
      }),
    );
  });

  it('matches entity and relation aliases case-insensitively', async () => {
    vectorPrisma.$queryRaw.mockResolvedValueOnce([{ id: 'entity-alias-1' }]);

    await service.query('api-key-1', {
      query: 'alice',
      limit: 5,
      entity_types: ['person'],
      relation_types: ['works_on'],
      scope: {},
    });

    expect(vectorPrisma.graphEntity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              canonicalName: {
                contains: 'alice',
                mode: 'insensitive',
              },
            },
            { id: { in: ['entity-alias-1'] } },
          ]),
        }),
      }),
    );
    expect(vectorPrisma.graphRelation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              fromEntity: {
                OR: expect.arrayContaining([
                  {
                    canonicalName: {
                      contains: 'alice',
                      mode: 'insensitive',
                    },
                  },
                  { id: { in: ['entity-alias-1'] } },
                ]),
              },
            },
            {
              toEntity: {
                OR: expect.arrayContaining([
                  {
                    canonicalName: {
                      contains: 'alice',
                      mode: 'insensitive',
                    },
                  },
                  { id: { in: ['entity-alias-1'] } },
                ]),
              },
            },
          ]),
        }),
      }),
    );
  });

  it('returns zero evidence summary when graph query has no entity or relation hits', async () => {
    vectorPrisma.graphEntity.findMany.mockResolvedValueOnce([]);
    vectorPrisma.graphRelation.findMany.mockResolvedValueOnce([]);
    vectorPrisma.graphObservation.count.mockResolvedValueOnce(0);
    vectorPrisma.graphObservation.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vectorPrisma.graphObservation.findFirst.mockResolvedValueOnce(null);

    const result = await service.query('api-key-1', {
      query: 'missing',
      limit: 5,
      scope: {},
    });

    expect(result).toEqual({
      entities: [],
      relations: [],
      evidence_summary: {
        observation_count: 0,
        source_count: 0,
        memory_fact_count: 0,
        latest_observed_at: null,
      },
    });
    expect(vectorPrisma.graphObservation.count).toHaveBeenCalledWith({
      where: {
        apiKeyId: 'api-key-1',
        id: { in: [] },
      },
    });
  });
});
