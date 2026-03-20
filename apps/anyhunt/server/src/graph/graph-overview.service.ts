import { Injectable } from '@nestjs/common';
import { GraphScopeService } from './graph-scope.service';
import { VectorPrismaService } from '../vector-prisma';
import type {
  GraphOverviewResponseDto,
  GraphQueryInputDto,
} from './dto/graph.schema';

@Injectable()
export class GraphOverviewService {
  constructor(
    private readonly vectorPrisma: VectorPrismaService,
    private readonly graphScopeService: GraphScopeService,
  ) {}

  async getOverview(
    apiKeyId: string,
    scope: GraphQueryInputDto['scope'],
  ): Promise<GraphOverviewResponseDto> {
    const graphScope = await this.graphScopeService.getScope(
      apiKeyId,
      scope.project_id,
    );

    if (!graphScope) {
      return {
        entity_count: 0,
        relation_count: 0,
        observation_count: 0,
        projection_status: 'disabled',
        last_projected_at: null,
      };
    }

    const [entityRows, relationRows, observationCount] = await Promise.all([
      this.vectorPrisma.graphObservation.findMany({
        where: {
          graphScopeId: graphScope.id,
          graphEntityId: { not: null },
        },
        distinct: ['graphEntityId'],
        select: { graphEntityId: true },
      }),
      this.vectorPrisma.graphObservation.findMany({
        where: {
          graphScopeId: graphScope.id,
          graphRelationId: { not: null },
        },
        distinct: ['graphRelationId'],
        select: { graphRelationId: true },
      }),
      this.vectorPrisma.graphObservation.count({
        where: { graphScopeId: graphScope.id },
      }),
    ]);

    return {
      entity_count: entityRows.length,
      relation_count: relationRows.length,
      observation_count: observationCount,
      projection_status: this.toReadStatus(
        graphScope.projectionStatus,
        observationCount,
      ),
      last_projected_at: graphScope.lastProjectedAt?.toISOString() ?? null,
    };
  }

  private toReadStatus(
    projectionStatus: string,
    observationCount: number,
  ): GraphOverviewResponseDto['projection_status'] {
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
}
