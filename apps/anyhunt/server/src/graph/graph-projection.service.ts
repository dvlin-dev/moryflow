/**
 * [INPUT]: graph projection / cleanup job payloads
 * [OUTPUT]: canonical graph entities/relations/observations
 * [POS]: Graph projection 与 cleanup 服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-vector/client';
import { MemoryRepository } from '../memory';
import { MemoryLlmService } from '../memory';
import { R2Service } from '../storage';
import { VectorPrismaService } from '../vector-prisma';
import type { MemoxGraphProjectionJobData } from '../queue';
import type { RawGraphEntity, RawGraphRelation } from './graph.types';
import {
  normalizeCanonicalName,
  normalizeEntityType,
  normalizeGraphEntities,
  normalizeGraphRelations,
  normalizeRelationType,
  shouldPromoteObservation,
} from './graph.utils';

const DEFAULT_GRAPH_CONFIDENCE = 0.6;

@Injectable()
export class GraphProjectionService {
  constructor(
    private readonly vectorPrisma: VectorPrismaService,
    private readonly memoryRepository: MemoryRepository,
    private readonly memoryLlmService: MemoryLlmService,
    private readonly r2Service: R2Service,
  ) {}

  async processJob(job: MemoxGraphProjectionJobData): Promise<void> {
    switch (job.kind) {
      case 'project_memory_fact':
        if (job.memoryId) {
          await this.projectMemoryFact(job.apiKeyId, job.memoryId);
        }
        return;
      case 'project_source_revision':
        if (job.sourceId && job.revisionId) {
          await this.projectSourceRevision(
            job.apiKeyId,
            job.sourceId,
            job.revisionId,
          );
        }
        return;
      case 'cleanup_memory_fact':
        if (job.memoryId) {
          await this.cleanupMemoryFactEvidence(job.apiKeyId, job.memoryId);
        }
        return;
      case 'cleanup_source':
        if (job.sourceId) {
          await this.cleanupSourceEvidence(job.apiKeyId, job.sourceId);
        }
        return;
      default:
        return;
    }
  }

  async projectMemoryFact(apiKeyId: string, memoryId: string): Promise<void> {
    const memory = await this.memoryRepository.findById(apiKeyId, memoryId);
    if (!memory) {
      await this.cleanupMemoryFactEvidence(apiKeyId, memoryId);
      return;
    }
    if (!memory.graphEnabled) {
      await this.cleanupMemoryFactEvidence(apiKeyId, memoryId);
      return;
    }
    const rawGraph = await this.memoryLlmService.extractGraph(memory.memory);
    await this.cleanupMemoryFactEvidence(apiKeyId, memoryId);
    if (!rawGraph) {
      return;
    }
    const entities = normalizeGraphEntities(
      rawGraph.entities as RawGraphEntity[],
    );
    const relations = normalizeGraphRelations(
      rawGraph.relations as RawGraphRelation[],
    );
    if (entities.length === 0 && relations.length === 0) {
      return;
    }

    await this.persistProjection({
      apiKeyId,
      entities,
      relations,
      evidenceMemoryId: memoryId,
    });
  }

  async projectSourceRevision(
    apiKeyId: string,
    sourceId: string,
    revisionId: string,
  ): Promise<void> {
    const source = await this.vectorPrisma.knowledgeSource.findFirst({
      where: {
        apiKeyId,
        id: sourceId,
        currentRevisionId: revisionId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!source) {
      await this.cleanupSourceEvidence(apiKeyId, sourceId);
      return;
    }

    const revision = await this.vectorPrisma.knowledgeSourceRevision.findFirst({
      where: { apiKeyId, id: revisionId, sourceId },
      select: { normalizedTextR2Key: true },
    });
    if (!revision?.normalizedTextR2Key) {
      await this.cleanupSourceEvidence(apiKeyId, sourceId);
      return;
    }

    const rawGraph = await this.memoryLlmService.extractGraph(
      await this.downloadTextFromKey(revision.normalizedTextR2Key),
    );
    await this.cleanupSourceEvidence(apiKeyId, sourceId);
    if (!rawGraph) {
      return;
    }

    const entities = normalizeGraphEntities(
      rawGraph.entities as RawGraphEntity[],
    );
    const relations = normalizeGraphRelations(
      rawGraph.relations as RawGraphRelation[],
    );
    if (entities.length === 0 && relations.length === 0) {
      return;
    }

    await this.persistProjection({
      apiKeyId,
      entities,
      relations,
      evidenceSourceId: sourceId,
      evidenceRevisionId: revisionId,
    });
  }

  async cleanupMemoryFactEvidence(
    apiKeyId: string,
    memoryId: string,
  ): Promise<void> {
    await this.vectorPrisma.$transaction(async (tx) => {
      await tx.graphObservation.deleteMany({
        where: {
          apiKeyId,
          evidenceMemoryId: memoryId,
        },
      });
    });

    await this.pruneOrphanGraphRelations(apiKeyId);
    await this.pruneOrphanGraphEntities(apiKeyId);
  }

  async cleanupSourceEvidence(
    apiKeyId: string,
    sourceId: string,
  ): Promise<void> {
    await this.vectorPrisma.$transaction(async (tx) => {
      await tx.graphObservation.deleteMany({
        where: {
          apiKeyId,
          evidenceSourceId: sourceId,
        },
      });
    });

    await this.pruneOrphanGraphRelations(apiKeyId);
    await this.pruneOrphanGraphEntities(apiKeyId);
  }

  private async persistProjection(params: {
    apiKeyId: string;
    entities: RawGraphEntity[];
    relations: RawGraphRelation[];
    evidenceMemoryId?: string;
    evidenceSourceId?: string;
    evidenceRevisionId?: string;
  }): Promise<void> {
    const { apiKeyId, evidenceMemoryId, evidenceSourceId, evidenceRevisionId } =
      params;

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
              apiKeyId_entityType_canonicalName: {
                apiKeyId,
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
                  apiKeyId,
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
            apiKeyId,
            graphEntityId: graphEntity?.id ?? null,
            evidenceSourceId: evidenceSourceId ?? null,
            evidenceRevisionId: evidenceRevisionId ?? null,
            evidenceMemoryId: evidenceMemoryId ?? null,
            observationType: evidenceMemoryId
              ? 'MEMORY_ENTITY'
              : 'SOURCE_ENTITY',
            payload: entity as Prisma.InputJsonValue,
            confidence,
          },
        });
      }

      for (const relation of params.relations) {
        const fromEntityId = this.resolveGraphEntityId(
          tx,
          apiKeyId,
          relation.source,
          entityIdMap,
        );
        const toEntityId = this.resolveGraphEntityId(
          tx,
          apiKeyId,
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
              apiKeyId,
              graphRelationId: null,
              evidenceSourceId: evidenceSourceId ?? null,
              evidenceRevisionId: evidenceRevisionId ?? null,
              evidenceMemoryId: evidenceMemoryId ?? null,
              observationType: evidenceMemoryId
                ? 'MEMORY_RELATION'
                : 'SOURCE_RELATION',
              payload: relation as Prisma.InputJsonValue,
              confidence,
            },
          });
          continue;
        }

        let graphRelation: { id: string } | null = null;

        if (
          fromEntityId &&
          toEntityId &&
          shouldPromoteObservation(confidence)
        ) {
          const relationType = normalizeRelationType(relation.relation);
          const existingRelation = await tx.graphRelation.findUnique({
            where: {
              apiKeyId_fromEntityId_toEntityId_relationType: {
                apiKeyId,
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
                  apiKeyId,
                  fromEntityId,
                  toEntityId,
                  relationType,
                  confidence,
                },
              });
        }

        await tx.graphObservation.create({
          data: {
            apiKeyId,
            graphRelationId: graphRelation?.id ?? null,
            evidenceSourceId: evidenceSourceId ?? null,
            evidenceRevisionId: evidenceRevisionId ?? null,
            evidenceMemoryId: evidenceMemoryId ?? null,
            observationType: evidenceMemoryId
              ? 'MEMORY_RELATION'
              : 'SOURCE_RELATION',
            payload: relation as Prisma.InputJsonValue,
            confidence,
          },
        });
      }
    });
  }

  private resolveGraphEntityId(
    _tx: Prisma.TransactionClient,
    apiKeyId: string,
    rawName: string | undefined,
    entityIdMap: Map<string, string>,
  ): string | null {
    if (!rawName?.trim()) {
      return null;
    }

    const canonicalName = normalizeCanonicalName(rawName);
    const existingId =
      entityIdMap.get(rawName) ?? entityIdMap.get(canonicalName);
    if (existingId) {
      return existingId;
    }
    void apiKeyId;
    return null;
  }

  private async pruneOrphanGraphRelations(apiKeyId: string): Promise<void> {
    await this.vectorPrisma.$executeRaw(Prisma.sql`
      DELETE FROM "GraphRelation" r
      WHERE r."apiKeyId" = ${apiKeyId}
        AND NOT EXISTS (
          SELECT 1 FROM "GraphObservation" o
          WHERE o."graphRelationId" = r.id
        )
    `);
  }

  private async pruneOrphanGraphEntities(apiKeyId: string): Promise<void> {
    await this.vectorPrisma.$executeRaw(Prisma.sql`
      DELETE FROM "GraphEntity" e
      WHERE e."apiKeyId" = ${apiKeyId}
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

  private async downloadTextFromKey(r2Key: string): Promise<string> {
    const [tenantId, vaultId, ...rest] = r2Key.split('/');
    if (!tenantId || !vaultId || rest.length === 0) {
      throw new Error(`Invalid graph source R2 key: ${r2Key}`);
    }

    const result = await this.r2Service.downloadStream(
      tenantId,
      vaultId,
      rest.join('/'),
    );
    const chunks: Buffer[] = [];
    for await (const chunk of result.stream) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk, 'utf8'));
      } else if (chunk instanceof Uint8Array) {
        chunks.push(Buffer.from(chunk));
      }
    }

    return Buffer.concat(chunks).toString('utf8');
  }
}
