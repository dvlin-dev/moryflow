import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-vector/client';
import {
  buildScopedActiveMemorySql,
  buildScopedActiveMemoryWhere,
  buildScopedSourceSql,
  buildScopedSourceWhere,
  hasMetadataScope,
  hasScopeConstraint,
  loadMetadataScopedEvidenceIds,
  toIsoStringOrNull,
  toNumberCount,
  type UnifiedScope,
} from '../common/utils/unified-scope.utils';
import { VectorPrismaService } from '../vector-prisma';
import type { GraphQueryInputDto } from '../graph/dto/graph.schema';
import type { MemoryOverviewResponseDto } from './dto';

type GraphScope = GraphQueryInputDto['scope'] & UnifiedScope;

@Injectable()
export class MemoryOverviewService {
  constructor(private readonly vectorPrisma: VectorPrismaService) {}

  async getOverview(
    apiKeyId: string,
    scope: GraphScope = {},
  ): Promise<MemoryOverviewResponseDto> {
    const activeMemoryWhere = buildScopedActiveMemoryWhere(apiKeyId, scope);
    const sourceWhere = buildScopedSourceWhere(apiKeyId, scope);
    const observationWhere = await this.buildObservationWhere(apiKeyId, scope);

    const [
      sourceCount,
      indexedSourceCount,
      pendingSourceCount,
      failedSourceCount,
      lastIndexedRevision,
      manualCount,
      derivedCount,
      entityCount,
      relationCount,
      observationCount,
      lastProjection,
    ] = await Promise.all([
      this.countSources(apiKeyId, scope, sourceWhere),
      this.countIndexedSources(apiKeyId, scope, sourceWhere),
      this.countPendingSources(apiKeyId, scope, sourceWhere),
      this.countFailedSources(apiKeyId, scope, sourceWhere),
      this.findLastIndexedAt(apiKeyId, scope, sourceWhere),
      this.countMemoryFacts(apiKeyId, scope, activeMemoryWhere, 'MANUAL'),
      this.countMemoryFacts(
        apiKeyId,
        scope,
        activeMemoryWhere,
        'SOURCE_DERIVED',
      ),
      this.vectorPrisma.graphObservation.findMany({
        where: {
          ...observationWhere,
          graphEntityId: { not: null },
        },
        distinct: ['graphEntityId'],
        select: { graphEntityId: true },
      }),
      this.vectorPrisma.graphObservation.findMany({
        where: {
          ...observationWhere,
          graphRelationId: { not: null },
        },
        distinct: ['graphRelationId'],
        select: { graphRelationId: true },
      }),
      this.vectorPrisma.graphObservation.count({
        where: observationWhere,
      }),
      this.vectorPrisma.graphObservation.findFirst({
        where: observationWhere,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      indexing: {
        source_count: sourceCount,
        indexed_source_count: indexedSourceCount,
        pending_source_count: pendingSourceCount,
        failed_source_count: failedSourceCount,
        last_indexed_at: toIsoStringOrNull(lastIndexedRevision),
      },
      facts: {
        manual_count: manualCount,
        derived_count: derivedCount,
      },
      graph: {
        entity_count: entityCount.length,
        relation_count: relationCount.length,
        projection_status: this.resolveProjectionStatus({
          entityCount: entityCount.length,
          relationCount: relationCount.length,
          observationCount,
          pendingSourceCount,
          indexedSourceCount,
          derivedCount,
        }),
        last_projected_at: lastProjection?.createdAt?.toISOString() ?? null,
      },
    };
  }

  private resolveProjectionStatus(params: {
    entityCount: number;
    relationCount: number;
    observationCount: number;
    pendingSourceCount: number;
    indexedSourceCount: number;
    derivedCount: number;
  }): 'idle' | 'building' | 'ready' {
    if (
      params.observationCount > 0 ||
      params.entityCount > 0 ||
      params.relationCount > 0
    ) {
      return 'ready';
    }

    if (
      params.pendingSourceCount > 0 ||
      params.indexedSourceCount > 0 ||
      params.derivedCount > 0
    ) {
      return 'building';
    }

    return 'idle';
  }

  private async buildObservationWhere(apiKeyId: string, scope: GraphScope) {
    if (!hasScopeConstraint(scope)) {
      return { apiKeyId };
    }

    if (hasMetadataScope(scope)) {
      const { sourceIds, memoryIds } = await loadMetadataScopedEvidenceIds(
        this.vectorPrisma,
        apiKeyId,
        scope,
      );

      return {
        apiKeyId,
        ...this.buildResolvedEvidenceScopeWhere(sourceIds, memoryIds),
      };
    }

    return {
      apiKeyId,
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

  private async countSources(
    apiKeyId: string,
    scope: GraphScope,
    sourceWhere: Record<string, unknown>,
  ) {
    if (!hasMetadataScope(scope)) {
      return this.vectorPrisma.knowledgeSource.count({ where: sourceWhere });
    }

    const rows = await this.vectorPrisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "KnowledgeSource" s
        WHERE ${buildScopedSourceSql(apiKeyId, scope, 's')}
      `,
    );

    return toNumberCount(rows[0]?.count);
  }

  private async countIndexedSources(
    apiKeyId: string,
    scope: GraphScope,
    sourceWhere: Record<string, unknown>,
  ) {
    if (!hasMetadataScope(scope)) {
      return this.vectorPrisma.knowledgeSource.count({
        where: {
          ...sourceWhere,
          currentRevisionId: { not: null },
          status: 'ACTIVE',
        },
      });
    }

    const rows = await this.vectorPrisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "KnowledgeSource" s
        WHERE ${buildScopedSourceSql(apiKeyId, scope, 's', [
          Prisma.sql`s."currentRevisionId" IS NOT NULL`,
          Prisma.sql`s.status = 'ACTIVE'`,
        ])}
      `,
    );

    return toNumberCount(rows[0]?.count);
  }

  private async countPendingSources(
    apiKeyId: string,
    scope: GraphScope,
    sourceWhere: Record<string, unknown>,
  ) {
    if (!hasMetadataScope(scope)) {
      const rows = await this.vectorPrisma.knowledgeSourceRevision.findMany({
        where: {
          apiKeyId,
          source: sourceWhere,
          status: {
            in: ['PENDING_UPLOAD', 'READY_TO_FINALIZE', 'PROCESSING'],
          },
        },
        distinct: ['sourceId'],
        select: { sourceId: true },
      });

      return rows.length;
    }

    const rows = await this.vectorPrisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(DISTINCT r."sourceId")::bigint AS count
        FROM "KnowledgeSourceRevision" r
        INNER JOIN "KnowledgeSource" s ON s.id = r."sourceId"
        WHERE ${buildScopedSourceSql(apiKeyId, scope, 's', [
          Prisma.sql`r."apiKeyId" = ${apiKeyId}`,
          Prisma.sql`r.status IN ('PENDING_UPLOAD', 'READY_TO_FINALIZE', 'PROCESSING')`,
        ])}
      `,
    );

    return toNumberCount(rows[0]?.count);
  }

  private async countFailedSources(
    apiKeyId: string,
    scope: GraphScope,
    sourceWhere: Record<string, unknown>,
  ) {
    if (!hasMetadataScope(scope)) {
      return this.vectorPrisma.knowledgeSource.count({
        where: {
          ...sourceWhere,
          status: 'FAILED' as const,
        },
      });
    }

    const rows = await this.vectorPrisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "KnowledgeSource" s
        WHERE ${buildScopedSourceSql(apiKeyId, scope, 's', [
          Prisma.sql`s.status = 'FAILED'`,
        ])}
      `,
    );

    return toNumberCount(rows[0]?.count);
  }

  private async findLastIndexedAt(
    apiKeyId: string,
    scope: GraphScope,
    sourceWhere: Record<string, unknown>,
  ) {
    if (!hasMetadataScope(scope)) {
      const row = await this.vectorPrisma.knowledgeSourceRevision.findFirst({
        where: {
          apiKeyId,
          source: sourceWhere,
          indexedAt: { not: null },
        },
        orderBy: { indexedAt: 'desc' },
        select: { indexedAt: true },
      });

      return row?.indexedAt ?? null;
    }

    const rows = await this.vectorPrisma.$queryRaw<
      Array<{ indexedAt: Date | string | null }>
    >(Prisma.sql`
      SELECT MAX(r."indexedAt") AS "indexedAt"
      FROM "KnowledgeSourceRevision" r
      INNER JOIN "KnowledgeSource" s ON s.id = r."sourceId"
      WHERE ${buildScopedSourceSql(apiKeyId, scope, 's', [
        Prisma.sql`r."apiKeyId" = ${apiKeyId}`,
        Prisma.sql`r."indexedAt" IS NOT NULL`,
      ])}
    `);

    return rows[0]?.indexedAt ?? null;
  }

  private async countMemoryFacts(
    apiKeyId: string,
    scope: GraphScope,
    activeMemoryWhere: Record<string, unknown>,
    originKind: 'MANUAL' | 'SOURCE_DERIVED',
  ) {
    if (!hasMetadataScope(scope)) {
      return this.vectorPrisma.memoryFact.count({
        where: {
          ...activeMemoryWhere,
          originKind,
        },
      });
    }

    const rows = await this.vectorPrisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "MemoryFact" m
        WHERE ${buildScopedActiveMemorySql(apiKeyId, scope, 'm', [
          Prisma.sql`m."originKind" = ${originKind}`,
        ])}
      `,
    );

    return toNumberCount(rows[0]?.count);
  }
}
