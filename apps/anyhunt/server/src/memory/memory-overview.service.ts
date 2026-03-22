import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-vector/client';
import {
  buildScopedActiveMemorySql,
  toNumberCount,
  type UnifiedScope,
} from '../common/utils/unified-scope.utils';
import { GraphScopeService } from '../graph/graph-scope.service';
import type { GraphQueryInputDto } from '../graph/dto/graph.schema';
import type { MemoryOverviewResponseDto } from './dto';
import { VectorPrismaService } from '../vector-prisma';
import { SourceIngestReadService } from '../sources/source-ingest-read.service';

type GraphScope = GraphQueryInputDto['scope'] & UnifiedScope;

type FactOverviewRow = {
  manualCount: bigint | number | null;
  derivedCount: bigint | number | null;
};

type GraphOverviewRow = {
  entityCount: bigint | number | null;
  relationCount: bigint | number | null;
  observationCount: bigint | number | null;
};

@Injectable()
export class MemoryOverviewService {
  constructor(
    private readonly vectorPrisma: VectorPrismaService,
    private readonly graphScopeService: GraphScopeService,
    private readonly sourceIngestReadService: SourceIngestReadService,
  ) {}

  async getOverview(
    apiKeyId: string,
    scope: GraphScope,
  ): Promise<MemoryOverviewResponseDto> {
    const [graphScope, indexingOverview, factOverview] = await Promise.all([
      this.graphScopeService.getScope(apiKeyId, scope.project_id),
      this.sourceIngestReadService.getOverview(apiKeyId, scope),
      this.getFactOverview(apiKeyId, scope),
    ]);

    const graphOverview = graphScope
      ? await this.getGraphOverview(graphScope.id)
      : {
          entityCount: 0,
          relationCount: 0,
          observationCount: 0,
        };

    const observationCount = toNumberCount(graphOverview.observationCount);

    return {
      indexing: {
        source_count: indexingOverview.sourceCount,
        indexed_source_count: indexingOverview.indexedSourceCount,
        indexing_source_count: indexingOverview.indexingSourceCount,
        attention_source_count: indexingOverview.attentionSourceCount,
        last_indexed_at: indexingOverview.lastIndexedAt,
      },
      facts: {
        manual_count: toNumberCount(factOverview.manualCount),
        derived_count: toNumberCount(factOverview.derivedCount),
      },
      graph: {
        entity_count: toNumberCount(graphOverview.entityCount),
        relation_count: toNumberCount(graphOverview.relationCount),
        projection_status: this.toReadStatus(
          graphScope?.projectionStatus ?? null,
          observationCount,
        ),
        last_projected_at: graphScope?.lastProjectedAt?.toISOString() ?? null,
      },
    };
  }

  private async getFactOverview(
    apiKeyId: string,
    scope: GraphScope,
  ): Promise<FactOverviewRow> {
    const [summary] = await this.vectorPrisma.$queryRaw<FactOverviewRow[]>(
      Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE m."originKind" = 'MANUAL')::bigint AS "manualCount",
          COUNT(*) FILTER (WHERE m."originKind" = 'SOURCE_DERIVED')::bigint AS "derivedCount"
        FROM "MemoryFact" m
        WHERE ${buildScopedActiveMemorySql(apiKeyId, scope, 'm')}
      `,
    );

    return (
      summary ?? {
        manualCount: 0,
        derivedCount: 0,
      }
    );
  }

  private async getGraphOverview(
    graphScopeId: string,
  ): Promise<GraphOverviewRow> {
    const [summary] = await this.vectorPrisma.$queryRaw<GraphOverviewRow[]>(
      Prisma.sql`
        SELECT
          COUNT(DISTINCT "graphEntityId")::bigint AS "entityCount",
          COUNT(DISTINCT "graphRelationId")::bigint AS "relationCount",
          COUNT(*)::bigint AS "observationCount"
        FROM "GraphObservation"
        WHERE "graphScopeId" = ${graphScopeId}
      `,
    );

    return (
      summary ?? {
        entityCount: 0,
        relationCount: 0,
        observationCount: 0,
      }
    );
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
}
