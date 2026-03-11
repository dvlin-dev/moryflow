import { Injectable } from '@nestjs/common';
import { VectorPrismaService } from '../vector-prisma';
import type {
  GraphOverviewResponseDto,
  GraphQueryInputDto,
} from './dto/graph.schema';

type GraphScope = GraphQueryInputDto['scope'];

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
      this.vectorPrisma.knowledgeSource.count({
        where: {
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
      }),
      this.vectorPrisma.memoryFact.count({
        where: {
          apiKeyId,
          graphEnabled: true,
          originKind: 'SOURCE_DERIVED',
          ...(scope.user_id ? { userId: scope.user_id } : {}),
          ...(scope.agent_id ? { agentId: scope.agent_id } : {}),
          ...(scope.app_id ? { appId: scope.app_id } : {}),
          ...(scope.run_id ? { runId: scope.run_id } : {}),
          ...(scope.org_id ? { orgId: scope.org_id } : {}),
          ...(scope.project_id ? { projectId: scope.project_id } : {}),
          ...(scope.metadata ? { metadata: scope.metadata } : {}),
          OR: [
            { expirationDate: null },
            { expirationDate: { gt: new Date() } },
          ],
        },
      }),
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
    if (!this.hasScopeConstraint(scope)) {
      return null;
    }

    return {
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
            is: {
              apiKeyId,
              ...(scope.user_id ? { userId: scope.user_id } : {}),
              ...(scope.agent_id ? { agentId: scope.agent_id } : {}),
              ...(scope.app_id ? { appId: scope.app_id } : {}),
              ...(scope.run_id ? { runId: scope.run_id } : {}),
              ...(scope.org_id ? { orgId: scope.org_id } : {}),
              ...(scope.project_id ? { projectId: scope.project_id } : {}),
              ...(scope.metadata ? { metadata: scope.metadata } : {}),
              OR: [
                { expirationDate: null },
                { expirationDate: { gt: new Date() } },
              ],
            },
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
}
