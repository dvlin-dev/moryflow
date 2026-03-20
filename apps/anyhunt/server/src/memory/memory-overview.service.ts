import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-vector/client';
import {
  buildScopedActiveMemorySql,
  buildScopedActiveMemoryWhere,
  buildScopedSourceSql,
  buildScopedSourceWhere,
  hasMetadataScope,
  toIsoStringOrNull,
  toNumberCount,
  type UnifiedScope,
} from '../common/utils/unified-scope.utils';
import { GraphScopeService } from '../graph/graph-scope.service';
import type { GraphQueryInputDto } from '../graph/dto/graph.schema';
import type { MemoryOverviewResponseDto } from './dto';
import { VectorPrismaService } from '../vector-prisma';

type GraphScope = GraphQueryInputDto['scope'] & UnifiedScope;

@Injectable()
export class MemoryOverviewService {
  constructor(
    private readonly vectorPrisma: VectorPrismaService,
    private readonly graphScopeService: GraphScopeService,
  ) {}

  async getOverview(
    apiKeyId: string,
    scope: GraphScope,
  ): Promise<MemoryOverviewResponseDto> {
    const activeMemoryWhere = buildScopedActiveMemoryWhere(apiKeyId, scope);
    const sourceWhere = buildScopedSourceWhere(apiKeyId, scope);
    const graphScope = await this.graphScopeService.getScope(
      apiKeyId,
      scope.project_id,
    );

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
      graphScope
        ? this.vectorPrisma.graphObservation.findMany({
            where: {
              graphScopeId: graphScope.id,
              graphEntityId: { not: null },
            },
            distinct: ['graphEntityId'],
            select: { graphEntityId: true },
          })
        : Promise.resolve([]),
      graphScope
        ? this.vectorPrisma.graphObservation.findMany({
            where: {
              graphScopeId: graphScope.id,
              graphRelationId: { not: null },
            },
            distinct: ['graphRelationId'],
            select: { graphRelationId: true },
          })
        : Promise.resolve([]),
      graphScope
        ? this.vectorPrisma.graphObservation.count({
            where: { graphScopeId: graphScope.id },
          })
        : Promise.resolve(0),
    ]);

    return {
      indexing: {
        source_count: sourceCount,
        indexed_source_count: indexedSourceCount,
        pending_source_count: pendingSourceCount,
        failed_source_count: failedSourceCount,
        last_indexed_at: toIsoStringOrNull(lastIndexedRevision?.updatedAt),
      },
      facts: {
        manual_count: manualCount,
        derived_count: derivedCount,
      },
      graph: {
        entity_count: entityCount.length,
        relation_count: relationCount.length,
        projection_status: this.toReadStatus(
          graphScope?.projectionStatus ?? null,
          observationCount,
        ),
        last_projected_at: graphScope?.lastProjectedAt?.toISOString() ?? null,
      },
    };
  }

  private toReadStatus(
    projectionStatus: string | null,
    observationCount: number,
  ): MemoryOverviewResponseDto['graph']['projection_status'] {
    switch (projectionStatus) {
      case 'FAILED':
        return 'failed';
      case 'BUILDING':
        return 'building';
      case 'READY':
        return observationCount > 0 ? 'ready' : 'idle';
      case 'IDLE':
        return observationCount > 0 ? 'ready' : 'idle';
      default:
        return 'disabled';
    }
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
          status: 'ACTIVE',
          currentRevisionId: { not: null },
        },
      });
    }

    const rows = await this.vectorPrisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "KnowledgeSource" s
        WHERE ${buildScopedSourceSql(apiKeyId, scope, 's', [
          Prisma.sql`s.status = 'ACTIVE'`,
          Prisma.sql`s."currentRevisionId" IS NOT NULL`,
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
      return this.vectorPrisma.knowledgeSource.count({
        where: {
          ...sourceWhere,
          OR: [{ currentRevisionId: null }, { status: 'PROCESSING' }],
        },
      });
    }

    const rows = await this.vectorPrisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "KnowledgeSource" s
        WHERE ${buildScopedSourceSql(apiKeyId, scope, 's', [
          Prisma.sql`(s."currentRevisionId" IS NULL OR s.status = 'PROCESSING')`,
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
          status: 'FAILED',
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
      return this.vectorPrisma.knowledgeSourceRevision.findFirst({
        where: {
          apiKeyId,
          source: sourceWhere,
          status: 'INDEXED',
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });
    }

    const rows = await this.vectorPrisma.$queryRaw<Array<{ updatedAt: Date }>>(
      Prisma.sql`
        SELECT r."updatedAt"
        FROM "KnowledgeSourceRevision" r
        INNER JOIN "KnowledgeSource" s ON s.id = r."sourceId"
        WHERE r."apiKeyId" = ${apiKeyId}
          AND r.status = 'INDEXED'
          AND ${buildScopedSourceSql(apiKeyId, scope, 's')}
        ORDER BY r."updatedAt" DESC
        LIMIT 1
      `,
    );

    return rows[0] ?? null;
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
