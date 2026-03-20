/**
 * [INPUT]: graphScopeId + memoryId/sourceId
 * [OUTPUT]: Graph context for retrieval responses
 * [POS]: Graph context 读取服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable } from '@nestjs/common';
import { VectorPrismaService } from '../vector-prisma';
import type {
  GraphContext,
  GraphEntityContext,
  GraphRelationContext,
} from './graph.types';

@Injectable()
export class GraphContextService {
  constructor(private readonly vectorPrisma: VectorPrismaService) {}

  async getForMemoryFact(
    graphScopeId: string,
    memoryId: string,
  ): Promise<GraphContext | null> {
    return (
      (await this.getForMemoryFacts(graphScopeId, [memoryId])).get(memoryId) ??
      null
    );
  }

  async getForSource(
    graphScopeId: string,
    sourceId: string,
  ): Promise<GraphContext | null> {
    return (
      (await this.getForSources(graphScopeId, [sourceId])).get(sourceId) ?? null
    );
  }

  async getForMemoryFacts(
    graphScopeId: string,
    memoryIds: string[],
  ): Promise<Map<string, GraphContext>> {
    return this.buildContexts({
      graphScopeId,
      evidenceField: 'evidenceMemoryId',
      evidenceIds: memoryIds,
    });
  }

  async getForSources(
    graphScopeId: string,
    sourceIds: string[],
  ): Promise<Map<string, GraphContext>> {
    return this.buildContexts({
      graphScopeId,
      evidenceField: 'evidenceSourceId',
      evidenceIds: sourceIds,
    });
  }

  private async buildContexts(params: {
    graphScopeId: string;
    evidenceField: 'evidenceMemoryId' | 'evidenceSourceId';
    evidenceIds: string[];
  }): Promise<Map<string, GraphContext>> {
    if (params.evidenceIds.length === 0) {
      return new Map();
    }

    const observations = await this.vectorPrisma.graphObservation.findMany({
      where: {
        graphScopeId: params.graphScopeId,
        [params.evidenceField]: {
          in: params.evidenceIds,
        },
      },
      include: {
        graphEntity: true,
        graphRelation: {
          include: {
            fromEntity: true,
            toEntity: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.max(20, params.evidenceIds.length * 20),
    });

    const contextMap = new Map<
      string,
      {
        entities: Map<string, GraphEntityContext>;
        relations: Map<string, GraphRelationContext>;
      }
    >();

    for (const observation of observations) {
      const evidenceId = observation[params.evidenceField];
      if (!evidenceId) {
        continue;
      }

      const context = contextMap.get(evidenceId) ?? {
        entities: new Map<string, GraphEntityContext>(),
        relations: new Map<string, GraphRelationContext>(),
      };
      contextMap.set(evidenceId, context);

      if (observation.graphEntity) {
        context.entities.set(observation.graphEntity.id, {
          id: observation.graphEntity.id,
          entity_type: observation.graphEntity.entityType,
          canonical_name: observation.graphEntity.canonicalName,
          aliases: observation.graphEntity.aliases,
        });
      }

      if (observation.graphRelation) {
        const relation = observation.graphRelation;
        context.relations.set(relation.id, {
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
        });
      }
    }

    return new Map(
      [...contextMap.entries()].map(([id, context]) => [
        id,
        {
          entities: [...context.entities.values()],
          relations: [...context.relations.values()],
        } satisfies GraphContext,
      ]),
    );
  }
}
