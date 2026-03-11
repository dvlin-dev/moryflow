import { Injectable } from '@nestjs/common';
import { VectorPrismaService } from '../vector-prisma';
import type { GraphQueryInputDto } from '../graph/dto/graph.schema';
import type { MemoryOverviewResponseDto } from './dto';

type GraphScope = GraphQueryInputDto['scope'];

@Injectable()
export class MemoryOverviewService {
  constructor(private readonly vectorPrisma: VectorPrismaService) {}

  async getOverview(
    apiKeyId: string,
    scope: GraphScope = {},
  ): Promise<MemoryOverviewResponseDto> {
    const activeMemoryWhere = this.buildActiveMemoryWhere(apiKeyId, scope);
    const sourceWhere = {
      apiKeyId,
      status: { not: 'DELETED' as const },
      ...(scope.user_id ? { userId: scope.user_id } : {}),
      ...(scope.agent_id ? { agentId: scope.agent_id } : {}),
      ...(scope.app_id ? { appId: scope.app_id } : {}),
      ...(scope.run_id ? { runId: scope.run_id } : {}),
      ...(scope.org_id ? { orgId: scope.org_id } : {}),
      ...(scope.project_id ? { projectId: scope.project_id } : {}),
      ...(scope.metadata ? { metadata: scope.metadata } : {}),
    };
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
      this.vectorPrisma.knowledgeSource.count({ where: sourceWhere }),
      this.vectorPrisma.knowledgeSource.count({
        where: {
          ...sourceWhere,
          currentRevisionId: { not: null },
          status: 'ACTIVE',
        },
      }),
      this.vectorPrisma.knowledgeSourceRevision.findMany({
        where: {
          apiKeyId,
          source: sourceWhere,
          status: {
            in: ['PENDING_UPLOAD', 'READY_TO_FINALIZE', 'PROCESSING'],
          },
        },
        distinct: ['sourceId'],
        select: { sourceId: true },
      }),
      this.vectorPrisma.knowledgeSource.count({
        where: {
          ...sourceWhere,
          status: 'FAILED' as const,
        },
      }),
      this.vectorPrisma.knowledgeSourceRevision.findFirst({
        where: {
          apiKeyId,
          source: sourceWhere,
          indexedAt: { not: null },
        },
        orderBy: { indexedAt: 'desc' },
        select: { indexedAt: true },
      }),
      this.vectorPrisma.memoryFact.count({
        where: {
          ...activeMemoryWhere,
          originKind: 'MANUAL',
        },
      }),
      this.vectorPrisma.memoryFact.count({
        where: {
          ...activeMemoryWhere,
          originKind: 'SOURCE_DERIVED',
        },
      }),
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
        pending_source_count: pendingSourceCount.length,
        failed_source_count: failedSourceCount,
        last_indexed_at: lastIndexedRevision?.indexedAt?.toISOString() ?? null,
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
          pendingSourceCount: pendingSourceCount.length,
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
    if (!this.hasScopeConstraint(scope)) {
      return { apiKeyId };
    }

    return {
      apiKeyId,
      OR: [
        {
          evidenceSource: {
            is: {
              apiKeyId,
              status: { not: 'DELETED' as const },
              ...(scope.user_id ? { userId: scope.user_id } : {}),
              ...(scope.agent_id ? { agentId: scope.agent_id } : {}),
              ...(scope.app_id ? { appId: scope.app_id } : {}),
              ...(scope.run_id ? { runId: scope.run_id } : {}),
              ...(scope.org_id ? { orgId: scope.org_id } : {}),
              ...(scope.project_id ? { projectId: scope.project_id } : {}),
              ...(scope.metadata ? { metadata: scope.metadata } : {}),
            },
          },
        },
        {
          evidenceMemory: {
            is: this.buildActiveMemoryWhere(apiKeyId, scope),
          },
        },
      ],
    };
  }

  private hasScopeConstraint(scope: GraphScope) {
    return Boolean(
      scope.user_id ||
      scope.agent_id ||
      scope.app_id ||
      scope.run_id ||
      scope.org_id ||
      scope.project_id ||
      scope.metadata,
    );
  }

  private buildActiveMemoryWhere(apiKeyId: string, scope: GraphScope) {
    return {
      apiKeyId,
      ...(scope.user_id ? { userId: scope.user_id } : {}),
      ...(scope.agent_id ? { agentId: scope.agent_id } : {}),
      ...(scope.app_id ? { appId: scope.app_id } : {}),
      ...(scope.run_id ? { runId: scope.run_id } : {}),
      ...(scope.org_id ? { orgId: scope.org_id } : {}),
      ...(scope.project_id ? { projectId: scope.project_id } : {}),
      ...(scope.metadata ? { metadata: scope.metadata } : {}),
      OR: [{ expirationDate: null }, { expirationDate: { gt: new Date() } }],
    };
  }
}
