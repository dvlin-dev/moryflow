/**
 * [INPUT]: graph projection / cleanup job payloads
 * [OUTPUT]: canonical graph entities/relations/observations
 * [POS]: Graph projection 与 cleanup 服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-vector/client';
import { MemoryLlmService, MemoryRepository } from '../memory';
import { VectorPrismaService } from '../vector-prisma';
import type { MemoxGraphProjectionJobData } from '../queue';
import type { RawGraphEntity, RawGraphRelation } from './graph.types';
import { GraphScopeService } from './graph-scope.service';
import {
  normalizeCanonicalName,
  normalizeEntityType,
  normalizeGraphEntities,
  normalizeGraphRelations,
  normalizeRelationType,
  shouldPromoteObservation,
} from './graph.utils';

const DEFAULT_GRAPH_CONFIDENCE = 0.6;
const GRAPH_PROJECTION_FAILED_CODE = 'GRAPH_PROJECTION_FAILED';

@Injectable()
export class GraphProjectionService {
  constructor(
    private readonly vectorPrisma: VectorPrismaService,
    private readonly memoryRepository: MemoryRepository,
    private readonly memoryLlmService: MemoryLlmService,
    private readonly graphScopeService: GraphScopeService,
  ) {}

  async processJob(job: MemoxGraphProjectionJobData): Promise<void> {
    switch (job.kind) {
      case 'project_memory_fact':
        if (job.memoryId) {
          await this.projectMemoryFact(job.apiKeyId, job.memoryId);
        }
        return;
      case 'cleanup_memory_fact':
        if (job.memoryId) {
          await this.cleanupMemoryFactEvidence(job.memoryId);
        }
        return;
      default:
        return;
    }
  }

  async projectMemoryFact(apiKeyId: string, memoryId: string): Promise<void> {
    const memory = await this.memoryRepository.findById(apiKeyId, memoryId);
    if (!memory) {
      await this.cleanupMemoryFactEvidence(memoryId);
      return;
    }
    if (!memory.graphScopeId) {
      await this.cleanupMemoryFactEvidence(memoryId);
      return;
    }

    try {
      const rawGraph = await this.memoryLlmService.extractGraph(memory.content);
      await this.cleanupMemoryFactEvidence(memoryId);
      if (!rawGraph) {
        await this.markMemoryProjectionReady(memoryId);
        await this.graphScopeService.reconcileProjectionState(
          memory.graphScopeId,
          {
            touchProjectedAt: true,
          },
        );
        return;
      }

      const entities = normalizeGraphEntities(
        rawGraph.entities as RawGraphEntity[],
      );
      const relations = normalizeGraphRelations(
        rawGraph.relations as RawGraphRelation[],
      );
      if (entities.length === 0 && relations.length === 0) {
        await this.markMemoryProjectionReady(memoryId);
        await this.graphScopeService.reconcileProjectionState(
          memory.graphScopeId,
          {
            touchProjectedAt: true,
          },
        );
        return;
      }

      await this.persistProjection({
        graphScopeId: memory.graphScopeId,
        entities,
        relations,
        evidenceMemoryId: memoryId,
        evidenceSourceId: memory.sourceId ?? undefined,
        evidenceRevisionId: memory.sourceRevisionId ?? undefined,
      });

      await this.vectorPrisma.memoryFact.update({
        where: { id: memoryId },
        data: {
          graphProjectionState: 'READY',
          graphProjectionErrorCode: null,
        },
      });
      await this.graphScopeService.reconcileProjectionState(
        memory.graphScopeId,
        {
          touchProjectedAt: true,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.vectorPrisma.memoryFact.update({
        where: { id: memoryId },
        data: {
          graphProjectionState: 'FAILED',
          graphProjectionErrorCode: GRAPH_PROJECTION_FAILED_CODE,
        },
      });
      await this.graphScopeService.markProjectionFailed(
        memory.graphScopeId,
        GRAPH_PROJECTION_FAILED_CODE,
        message,
      );
      throw error;
    }
  }

  private async markMemoryProjectionReady(memoryId: string): Promise<void> {
    await this.vectorPrisma.memoryFact.update({
      where: { id: memoryId },
      data: {
        graphProjectionState: 'READY',
        graphProjectionErrorCode: null,
      },
    });
  }

  async cleanupMemoryFactEvidence(memoryId: string): Promise<void> {
    const observations = await this.vectorPrisma.graphObservation.findMany({
      where: {
        evidenceMemoryId: memoryId,
      },
      select: {
        graphScopeId: true,
      },
      distinct: ['graphScopeId'],
    });

    await this.vectorPrisma.graphObservation.deleteMany({
      where: {
        evidenceMemoryId: memoryId,
      },
    });

    for (const observation of observations) {
      await this.pruneOrphanGraphRelations(observation.graphScopeId);
      await this.pruneOrphanGraphEntities(observation.graphScopeId);
      await this.graphScopeService.reconcileProjectionState(
        observation.graphScopeId,
        {
          touchProjectedAt: true,
        },
      );
    }
  }

  private async persistProjection(params: {
    graphScopeId: string;
    entities: RawGraphEntity[];
    relations: RawGraphRelation[];
    evidenceMemoryId: string;
    evidenceSourceId?: string;
    evidenceRevisionId?: string;
  }): Promise<void> {
    const {
      graphScopeId,
      evidenceMemoryId,
      evidenceSourceId,
      evidenceRevisionId,
    } = params;

    await this.vectorPrisma.$transaction(async (tx) => {
      const entityIdMap = new Map<string, string>();

      for (const entity of params.entities) {
        const entityName = (entity.name ?? entity.id ?? '').trim();
        if (!entityName) {
          continue;
        }

        const canonicalName = normalizeCanonicalName(entityName);
        const entityType = normalizeEntityType(entity.type);
        const confidence =
          typeof entity.confidence === 'number'
            ? entity.confidence
            : DEFAULT_GRAPH_CONFIDENCE;

        let graphEntity: { id: string } | null = null;
        if (shouldPromoteObservation(confidence)) {
          const existing = await tx.graphEntity.findUnique({
            where: {
              graphScopeId_entityType_canonicalName: {
                graphScopeId,
                entityType,
                canonicalName,
              },
            },
          });
          const aliases = [
            ...new Set([...(existing?.aliases ?? []), entityName]),
          ];
          graphEntity = existing
            ? await tx.graphEntity.update({
                where: { id: existing.id },
                data: {
                  aliases,
                  lastSeenAt: new Date(),
                },
              })
            : await tx.graphEntity.create({
                data: {
                  graphScopeId,
                  entityType,
                  canonicalName,
                  aliases,
                  lastSeenAt: new Date(),
                },
              });

          entityIdMap.set(entityName, graphEntity.id);
          entityIdMap.set(canonicalName, graphEntity.id);
        }

        await tx.graphObservation.create({
          data: {
            graphScopeId,
            graphEntityId: graphEntity?.id ?? null,
            evidenceSourceId: evidenceSourceId ?? null,
            evidenceRevisionId: evidenceRevisionId ?? null,
            evidenceMemoryId,
            observationType: 'MEMORY_ENTITY',
            payload: entity as Prisma.InputJsonValue,
            confidence,
          },
        });
      }

      for (const relation of params.relations) {
        const fromEntityId = this.resolveGraphEntityId(
          relation.source,
          entityIdMap,
        );
        const toEntityId = this.resolveGraphEntityId(
          relation.target,
          entityIdMap,
        );
        const confidence =
          typeof relation.confidence === 'number'
            ? relation.confidence
            : DEFAULT_GRAPH_CONFIDENCE;

        if (!fromEntityId || !toEntityId) {
          await tx.graphObservation.create({
            data: {
              graphScopeId,
              graphRelationId: null,
              evidenceSourceId: evidenceSourceId ?? null,
              evidenceRevisionId: evidenceRevisionId ?? null,
              evidenceMemoryId,
              observationType: 'MEMORY_RELATION',
              payload: relation as Prisma.InputJsonValue,
              confidence,
            },
          });
          continue;
        }

        let graphRelation: { id: string } | null = null;
        if (shouldPromoteObservation(confidence)) {
          const relationType = normalizeRelationType(relation.relation);
          const existingRelation = await tx.graphRelation.findUnique({
            where: {
              graphScopeId_fromEntityId_toEntityId_relationType: {
                graphScopeId,
                fromEntityId,
                toEntityId,
                relationType,
              },
            },
          });

          graphRelation = existingRelation
            ? await tx.graphRelation.update({
                where: { id: existingRelation.id },
                data: {
                  confidence: Math.max(existingRelation.confidence, confidence),
                },
              })
            : await tx.graphRelation.create({
                data: {
                  graphScopeId,
                  fromEntityId,
                  toEntityId,
                  relationType,
                  confidence,
                },
              });
        }

        await tx.graphObservation.create({
          data: {
            graphScopeId,
            graphRelationId: graphRelation?.id ?? null,
            evidenceSourceId: evidenceSourceId ?? null,
            evidenceRevisionId: evidenceRevisionId ?? null,
            evidenceMemoryId,
            observationType: 'MEMORY_RELATION',
            payload: relation as Prisma.InputJsonValue,
            confidence,
          },
        });
      }
    });
  }

  private resolveGraphEntityId(
    rawName: string | undefined,
    entityIdMap: Map<string, string>,
  ): string | null {
    if (!rawName?.trim()) {
      return null;
    }

    const canonicalName = normalizeCanonicalName(rawName);
    return entityIdMap.get(rawName) ?? entityIdMap.get(canonicalName) ?? null;
  }

  private async pruneOrphanGraphRelations(graphScopeId: string): Promise<void> {
    await this.vectorPrisma.$executeRaw(Prisma.sql`
      DELETE FROM "GraphRelation" r
      WHERE r."graphScopeId" = ${graphScopeId}
        AND NOT EXISTS (
          SELECT 1 FROM "GraphObservation" o
          WHERE o."graphRelationId" = r.id
        )
    `);
  }

  private async pruneOrphanGraphEntities(graphScopeId: string): Promise<void> {
    await this.vectorPrisma.$executeRaw(Prisma.sql`
      DELETE FROM "GraphEntity" e
      WHERE e."graphScopeId" = ${graphScopeId}
        AND NOT EXISTS (
          SELECT 1 FROM "GraphObservation" o
          WHERE o."graphEntityId" = e.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM "GraphRelation" r
          WHERE r."fromEntityId" = e.id OR r."toEntityId" = e.id
        )
    `);
  }
}
