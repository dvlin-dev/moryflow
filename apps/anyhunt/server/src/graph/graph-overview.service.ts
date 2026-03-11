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
  toNumberCount,
  type UnifiedScope,
} from '../common/utils/unified-scope.utils';
import { VectorPrismaService } from '../vector-prisma';
import type {
  GraphOverviewResponseDto,
  GraphQueryInputDto,
} from './dto/graph.schema';

type GraphScope = GraphQueryInputDto['scope'] & UnifiedScope;

@Injectable()
export class GraphOverviewService {
  constructor(private readonly vectorPrisma: VectorPrismaService) {}

  async getOverview(
    apiKeyId: string,
    scope: GraphScope = {},
  ): Promise<GraphOverviewResponseDto> {
    const observationScopeWhere = await this.buildObservationScopeWhere(
      apiKeyId,
      scope,
    );
    const observationWhere = observationScopeWhere
      ? { apiKeyId, ...observationScopeWhere }
      : { apiKeyId };

    const [
      entityRows,
      relationRows,
      observationCount,
      latestObservation,
      sourceCount,
      derivedCount,
    ] = await Promise.all([
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
      this.vectorPrisma.graphObservation.count({ where: observationWhere }),
      this.vectorPrisma.graphObservation.findFirst({
        where: observationWhere,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.countSources(apiKeyId, scope),
      this.countDerivedFacts(apiKeyId, scope),
    ]);

    return {
      entity_count: entityRows.length,
      relation_count: relationRows.length,
      observation_count: observationCount,
      projection_status:
        observationCount > 0
          ? 'ready'
          : sourceCount > 0 || derivedCount > 0
            ? 'building'
            : 'idle',
      last_projected_at: latestObservation?.createdAt?.toISOString() ?? null,
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

  private async countSources(apiKeyId: string, scope: GraphScope) {
    if (!hasMetadataScope(scope)) {
      return this.vectorPrisma.knowledgeSource.count({
        where: buildScopedSourceWhere(apiKeyId, scope),
      });
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

  private async countDerivedFacts(apiKeyId: string, scope: GraphScope) {
    if (!hasMetadataScope(scope)) {
      return this.vectorPrisma.memoryFact.count({
        where: {
          ...buildScopedActiveMemoryWhere(apiKeyId, scope),
          graphEnabled: true,
          originKind: 'SOURCE_DERIVED',
        },
      });
    }

    const rows = await this.vectorPrisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "MemoryFact" m
        WHERE ${buildScopedActiveMemorySql(apiKeyId, scope, 'm', [
          Prisma.sql`m."graphEnabled" = true`,
          Prisma.sql`m."originKind" = 'SOURCE_DERIVED'`,
        ])}
      `,
    );

    return toNumberCount(rows[0]?.count);
  }
}
