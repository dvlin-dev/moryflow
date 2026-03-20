import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-vector/client';
import type { JsonValue } from '../common/utils/json.zod';
import { VectorPrismaService } from '../vector-prisma';
import { GraphScopeService } from './graph-scope.service';
import type {
  GraphEntityDetailResponseDto,
  GraphQueryInputDto,
  GraphQueryResponseDto,
} from './dto/graph.schema';

@Injectable()
export class GraphQueryService {
  constructor(
    private readonly vectorPrisma: VectorPrismaService,
    private readonly graphScopeService: GraphScopeService,
  ) {}

  async query(
    apiKeyId: string,
    dto: GraphQueryInputDto,
  ): Promise<GraphQueryResponseDto> {
    const graphScope = await this.graphScopeService.getScope(
      apiKeyId,
      dto.scope.project_id,
    );
    if (!graphScope) {
      return {
        entities: [],
        relations: [],
        evidence_summary: {
          observation_count: 0,
          source_count: 0,
          memory_fact_count: 0,
          latest_observed_at: null,
        },
      };
    }
    const aliasMatchedEntityIds = dto.query
      ? await this.findEntityIdsByAlias(
          graphScope.id,
          dto.query,
          dto.entity_types ?? [],
        )
      : [];

    const [entities, relations] = await Promise.all([
      this.vectorPrisma.graphEntity.findMany({
        where: {
          graphScopeId: graphScope.id,
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
                    id: { in: aliasMatchedEntityIds },
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ lastSeenAt: 'desc' }, { updatedAt: 'desc' }],
        take: dto.limit,
      }),
      this.vectorPrisma.graphRelation.findMany({
        where: {
          graphScopeId: graphScope.id,
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
        },
        include: {
          fromEntity: true,
          toEntity: true,
        },
        orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
        take: dto.limit,
      }),
    ]);

    const evidenceSummary = await this.loadEvidenceSummary({
      graphScopeId: graphScope.id,
      entityIds: entities.map((entity) => entity.id),
      relationIds: relations.map((relation) => relation.id),
    });

    return {
      entities: entities.map((entity) => ({
        id: entity.id,
        entity_type: entity.entityType,
        canonical_name: entity.canonicalName,
        aliases: entity.aliases,
        metadata: (entity.metadata as Record<string, JsonValue> | null) ?? null,
        last_seen_at: entity.lastSeenAt?.toISOString() ?? null,
      })),
      relations: relations.map((relation) =>
        this.toRelationReadModel(relation),
      ),
      evidence_summary: evidenceSummary,
    };
  }

  async getEntityDetail(
    apiKeyId: string,
    entityId: string,
    scope: GraphQueryInputDto['scope'],
  ): Promise<GraphEntityDetailResponseDto> {
    const graphScope = await this.graphScopeService.getScope(
      apiKeyId,
      scope.project_id,
    );
    if (!graphScope) {
      throw new NotFoundException('Graph entity not found');
    }

    const entity = await this.vectorPrisma.graphEntity.findFirst({
      where: {
        graphScopeId: graphScope.id,
        id: entityId,
      },
      include: {
        incomingRelations: {
          where: { graphScopeId: graphScope.id },
          include: {
            fromEntity: true,
            toEntity: true,
          },
          orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
        },
        outgoingRelations: {
          where: { graphScopeId: graphScope.id },
          include: {
            fromEntity: true,
            toEntity: true,
          },
          orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
        },
        observations: {
          where: { graphScopeId: graphScope.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!entity) {
      throw new NotFoundException('Graph entity not found');
    }

    const evidenceSummary = await this.loadEvidenceSummary({
      graphScopeId: graphScope.id,
      entityIds: [entityId],
      relationIds: [
        ...entity.incomingRelations.map((relation) => relation.id),
        ...entity.outgoingRelations.map((relation) => relation.id),
      ],
    });

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

  private async loadEvidenceSummary(params: {
    graphScopeId: string;
    entityIds: string[];
    relationIds: string[];
  }) {
    const where: Prisma.GraphObservationWhereInput =
      params.entityIds.length === 0 && params.relationIds.length === 0
        ? {
            graphScopeId: params.graphScopeId,
            id: { in: [] },
          }
        : {
            graphScopeId: params.graphScopeId,
            OR: [
              ...(params.entityIds.length
                ? [{ graphEntityId: { in: params.entityIds } }]
                : []),
              ...(params.relationIds.length
                ? [{ graphRelationId: { in: params.relationIds } }]
                : []),
            ],
          };

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
    graphScopeId: string,
    query: string,
    entityTypes: string[],
  ): Promise<string[]> {
    const escapedQuery = this.escapeIlikePattern(query);
    const rows = await this.vectorPrisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT DISTINCT e.id::text AS id
        FROM "GraphEntity" e
        CROSS JOIN LATERAL unnest(e.aliases) AS alias(value)
        WHERE e."graphScopeId" = ${graphScopeId}
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
