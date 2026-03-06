/**
 * [INPUT]: apiKeyId + memoryId/sourceId
 * [OUTPUT]: Graph context for retrieval responses
 * [POS]: Graph context 读取服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
    apiKeyId: string,
    memoryId: string,
  ): Promise<GraphContext | null> {
    return (
      (await this.getForMemoryFacts(apiKeyId, [memoryId])).get(memoryId) ?? null
    );
  }

  async getForSource(
    apiKeyId: string,
    sourceId: string,
  ): Promise<GraphContext | null> {
    return (
      (await this.getForSources(apiKeyId, [sourceId])).get(sourceId) ?? null
    );
  }

  async getForMemoryFacts(
    apiKeyId: string,
    memoryIds: string[],
  ): Promise<Map<string, GraphContext>> {
    return this.buildContexts({
      apiKeyId,
      evidenceField: 'evidenceMemoryId',
      evidenceIds: memoryIds,
    });
  }

  async getForSources(
    apiKeyId: string,
    sourceIds: string[],
  ): Promise<Map<string, GraphContext>> {
    return this.buildContexts({
      apiKeyId,
      evidenceField: 'evidenceSourceId',
      evidenceIds: sourceIds,
    });
  }

  private async buildContexts(params: {
    apiKeyId: string;
    evidenceField: 'evidenceMemoryId' | 'evidenceSourceId';
    evidenceIds: string[];
  }): Promise<Map<string, GraphContext>> {
    if (params.evidenceIds.length === 0) {
      return new Map();
    }

    const observations = await this.vectorPrisma.graphObservation.findMany({
      where: {
        apiKeyId: params.apiKeyId,
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
