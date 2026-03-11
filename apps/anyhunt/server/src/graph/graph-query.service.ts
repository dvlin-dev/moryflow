import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-vector/client';
import type { JsonValue } from '../common/utils/json.zod';
import {
  buildScopedActiveMemoryWhere,
  buildScopedSourceWhere,
  hasMetadataScope,
  hasScopeConstraint,
  loadMetadataScopedEvidenceIds,
  type UnifiedScope,
} from '../common/utils/unified-scope.utils';
import { VectorPrismaService } from '../vector-prisma';
import type {
  GraphEntityDetailResponseDto,
  GraphQueryInputDto,
  GraphQueryResponseDto,
} from './dto/graph.schema';

type GraphScope = GraphQueryInputDto['scope'] & UnifiedScope;

@Injectable()
export class GraphQueryService {
  constructor(private readonly vectorPrisma: VectorPrismaService) {}

  async query(
    apiKeyId: string,
    dto: GraphQueryInputDto,
  ): Promise<GraphQueryResponseDto> {
    const observationScopeWhere = await this.buildObservationScopeWhere(
      apiKeyId,
      dto.scope,
    );
    const aliasMatchedEntityIds = dto.query
      ? await this.findEntityIdsByAlias(
          apiKeyId,
          dto.query,
          dto.entity_types ?? [],
        )
      : [];

    const [entities, relations] = await Promise.all([
      this.vectorPrisma.graphEntity.findMany({
        where: {
          apiKeyId,
          ...(dto.entity_types?.length
            ? { entityType: { in: dto.entity_types } }
            : {}),
          ...(dto.query
            ? {
                OR: [
                  {
                    canonicalName: {
                      contains: dto.query,
                      mode: 'insensitive',
                    },
                  },
                  {
                    ...(aliasMatchedEntityIds.length
                      ? { id: { in: aliasMatchedEntityIds } }
                      : { id: { in: [] } }),
                  },
                ],
              }
            : {}),
          ...(observationScopeWhere
            ? { observations: { some: observationScopeWhere } }
            : {}),
        },
        orderBy: [{ lastSeenAt: 'desc' }, { updatedAt: 'desc' }],
        take: dto.limit,
      }),
      this.vectorPrisma.graphRelation.findMany({
        where: {
          apiKeyId,
          ...(dto.relation_types?.length
            ? { relationType: { in: dto.relation_types } }
            : {}),
          ...(dto.query
            ? {
                OR: [
                  {
                    relationType: {
                      contains: dto.query,
                      mode: 'insensitive',
                    },
                  },
                  {
                    fromEntity: {
                      OR: [
                        {
                          canonicalName: {
                            contains: dto.query,
                            mode: 'insensitive',
                          },
                        },
                        ...(aliasMatchedEntityIds.length
                          ? [{ id: { in: aliasMatchedEntityIds } }]
                          : []),
                      ],
                    },
                  },
                  {
                    toEntity: {
                      OR: [
                        {
                          canonicalName: {
                            contains: dto.query,
                            mode: 'insensitive',
                          },
                        },
                        ...(aliasMatchedEntityIds.length
                          ? [{ id: { in: aliasMatchedEntityIds } }]
                          : []),
                      ],
                    },
                  },
                ],
              }
            : {}),
          ...(observationScopeWhere
            ? { observations: { some: observationScopeWhere } }
            : {}),
        },
        include: {
          fromEntity: true,
          toEntity: true,
        },
        orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
        take: dto.limit,
      }),
    ]);

    const observationFilter = this.buildObservationSummaryFilter({
      apiKeyId,
      observationScopeWhere,
      entityIds: entities.map((entity) => entity.id),
      relationIds: relations.map((relation) => relation.id),
    });
    const evidenceSummary = await this.loadEvidenceSummary(observationFilter);

    return {
      entities: entities.map((entity) => ({
        id: entity.id,
        entity_type: entity.entityType,
        canonical_name: entity.canonicalName,
        aliases: entity.aliases,
        metadata: (entity.metadata as Record<string, JsonValue> | null) ?? null,
        last_seen_at: entity.lastSeenAt?.toISOString() ?? null,
      })),
      relations: relations.map((relation) => ({
        id: relation.id,
        relation_type: relation.relationType,
        confidence: relation.confidence,
        from: {
          id: relation.fromEntity.id,
          entity_type: relation.fromEntity.entityType,
          canonical_name: relation.fromEntity.canonicalName,
          aliases: relation.fromEntity.aliases,
        },
        to: {
          id: relation.toEntity.id,
          entity_type: relation.toEntity.entityType,
          canonical_name: relation.toEntity.canonicalName,
          aliases: relation.toEntity.aliases,
        },
      })),
      evidence_summary: evidenceSummary,
    };
  }

  async getEntityDetail(
    apiKeyId: string,
    entityId: string,
    scope: GraphScope = {},
  ): Promise<GraphEntityDetailResponseDto> {
    const observationScopeWhere = await this.buildObservationScopeWhere(
      apiKeyId,
      scope,
    );
    const entity = await this.vectorPrisma.graphEntity.findFirst({
      where: {
        apiKeyId,
        id: entityId,
        ...(observationScopeWhere
          ? { observations: { some: observationScopeWhere } }
          : {}),
      },
      include: {
        incomingRelations: {
          ...(observationScopeWhere
            ? { where: { observations: { some: observationScopeWhere } } }
            : {}),
          include: {
            fromEntity: true,
            toEntity: true,
          },
          orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
        },
        outgoingRelations: {
          ...(observationScopeWhere
            ? { where: { observations: { some: observationScopeWhere } } }
            : {}),
          include: {
            fromEntity: true,
            toEntity: true,
          },
          orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
        },
        observations: {
          ...(observationScopeWhere ? { where: observationScopeWhere } : {}),
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!entity) {
      throw new NotFoundException('Graph entity not found');
    }

    if (observationScopeWhere && entity.observations.length === 0) {
      throw new NotFoundException('Graph entity not found');
    }
    const evidenceSummary = await this.loadEvidenceSummary(
      this.buildObservationSummaryFilter({
        apiKeyId,
        observationScopeWhere,
        entityIds: [entityId],
        relationIds: [
          ...entity.incomingRelations.map((relation) => relation.id),
          ...entity.outgoingRelations.map((relation) => relation.id),
        ],
      }),
    );

    return {
      entity: {
        id: entity.id,
        entity_type: entity.entityType,
        canonical_name: entity.canonicalName,
        aliases: entity.aliases,
        metadata: (entity.metadata as Record<string, JsonValue> | null) ?? null,
        last_seen_at: entity.lastSeenAt?.toISOString() ?? null,
        incoming_relations: entity.incomingRelations.map((relation) =>
          this.toRelationReadModel(relation),
        ),
        outgoing_relations: entity.outgoingRelations.map((relation) =>
          this.toRelationReadModel(relation),
        ),
      },
      evidence_summary: evidenceSummary,
      recent_observations: entity.observations.map((observation) => ({
        id: observation.id,
        observation_type: observation.observationType,
        confidence: observation.confidence ?? null,
        evidence_source_id: observation.evidenceSourceId ?? null,
        evidence_revision_id: observation.evidenceRevisionId ?? null,
        evidence_chunk_id: observation.evidenceChunkId ?? null,
        evidence_memory_id: observation.evidenceMemoryId ?? null,
        payload: observation.payload as Record<string, JsonValue>,
        created_at: observation.createdAt.toISOString(),
      })),
    };
  }

  private toRelationReadModel(relation: {
    id: string;
    relationType: string;
    confidence: number;
    fromEntity: {
      id: string;
      entityType: string;
      canonicalName: string;
      aliases: string[];
    };
    toEntity: {
      id: string;
      entityType: string;
      canonicalName: string;
      aliases: string[];
    };
  }) {
    return {
      id: relation.id,
      relation_type: relation.relationType,
      confidence: relation.confidence,
      from: {
        id: relation.fromEntity.id,
        entity_type: relation.fromEntity.entityType,
        canonical_name: relation.fromEntity.canonicalName,
        aliases: relation.fromEntity.aliases,
      },
      to: {
        id: relation.toEntity.id,
        entity_type: relation.toEntity.entityType,
        canonical_name: relation.toEntity.canonicalName,
        aliases: relation.toEntity.aliases,
      },
    };
  }

  private async buildObservationScopeWhere(
    apiKeyId: string,
    scope: GraphScope,
  ): Promise<Record<string, unknown> | null> {
    if (!hasScopeConstraint(scope)) {
      return null;
    }

    if (hasMetadataScope(scope)) {
      const { sourceIds, memoryIds } = await loadMetadataScopedEvidenceIds(
        this.vectorPrisma,
        apiKeyId,
        scope,
      );

      return this.buildResolvedEvidenceScopeWhere(sourceIds, memoryIds);
    }

    return {
      OR: [
        {
          evidenceSource: {
            is: buildScopedSourceWhere(apiKeyId, scope),
          },
        },
        {
          evidenceMemory: {
            is: buildScopedActiveMemoryWhere(apiKeyId, scope),
          },
        },
      ],
    };
  }

  private buildResolvedEvidenceScopeWhere(
    sourceIds: string[],
    memoryIds: string[],
  ) {
    const orConditions: Array<Record<string, unknown>> = [];

    if (sourceIds.length > 0) {
      orConditions.push({ evidenceSourceId: { in: sourceIds } });
    }
    if (memoryIds.length > 0) {
      orConditions.push({ evidenceMemoryId: { in: memoryIds } });
    }

    if (orConditions.length === 0) {
      return {
        OR: [
          { evidenceSourceId: { in: [] } },
          { evidenceMemoryId: { in: [] } },
        ],
      };
    }

    return { OR: orConditions };
  }

  private buildObservationSummaryFilter(params: {
    apiKeyId: string;
    observationScopeWhere: Record<string, unknown> | null;
    entityIds: string[];
    relationIds: string[];
  }) {
    const { apiKeyId, observationScopeWhere, entityIds, relationIds } = params;

    if (entityIds.length === 0 && relationIds.length === 0) {
      return {
        apiKeyId,
        id: { in: [] as string[] },
      };
    }

    const targetFilter: Record<string, unknown> = {};

    targetFilter.OR = [
      ...(entityIds.length ? [{ graphEntityId: { in: entityIds } }] : []),
      ...(relationIds.length ? [{ graphRelationId: { in: relationIds } }] : []),
    ];

    if (observationScopeWhere && targetFilter.OR) {
      return {
        apiKeyId,
        AND: [observationScopeWhere, targetFilter],
      };
    }

    if (observationScopeWhere) {
      return {
        apiKeyId,
        ...observationScopeWhere,
      };
    }

    if (targetFilter.OR) {
      return {
        apiKeyId,
        ...targetFilter,
      };
    }

    return { apiKeyId };
  }

  private async loadEvidenceSummary(where: Record<string, unknown>) {
    const [sourceRows, memoryRows, observationCount, latestObservation] =
      await Promise.all([
        this.vectorPrisma.graphObservation.findMany({
          where: {
            ...where,
            evidenceSourceId: { not: null },
          },
          distinct: ['evidenceSourceId'],
          select: { evidenceSourceId: true },
        }),
        this.vectorPrisma.graphObservation.findMany({
          where: {
            ...where,
            evidenceMemoryId: { not: null },
          },
          distinct: ['evidenceMemoryId'],
          select: { evidenceMemoryId: true },
        }),
        this.vectorPrisma.graphObservation.count({ where }),
        this.vectorPrisma.graphObservation.findFirst({
          where,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

    return {
      observation_count: observationCount,
      source_count: sourceRows.length,
      memory_fact_count: memoryRows.length,
      latest_observed_at: latestObservation?.createdAt?.toISOString() ?? null,
    };
  }

  private async findEntityIdsByAlias(
    apiKeyId: string,
    query: string,
    entityTypes: string[],
  ): Promise<string[]> {
    const escapedQuery = this.escapeIlikePattern(query);
    const rows = await this.vectorPrisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT DISTINCT e.id::text AS id
        FROM "GraphEntity" e
        CROSS JOIN LATERAL unnest(e.aliases) AS alias(value)
        WHERE e."apiKeyId" = ${apiKeyId}
          ${entityTypes.length > 0 ? Prisma.sql`AND e."entityType" IN (${Prisma.join(entityTypes)})` : Prisma.empty}
          AND alias.value ILIKE ${`%${escapedQuery}%`} ESCAPE '\\'
      `,
    );

    return rows.map((row) => row.id);
  }

  private escapeIlikePattern(value: string): string {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
  }
}
