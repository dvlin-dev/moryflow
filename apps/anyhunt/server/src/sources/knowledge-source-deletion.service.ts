/**
 * [INPUT]: apiKeyId + sourceId
 * [OUTPUT]: 删除请求结果 + cleanup job side effects
 * [POS]: Sources 删除编排服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  MEMOX_GRAPH_PROJECTION_QUEUE,
  MEMOX_SOURCE_CLEANUP_QUEUE,
  type MemoxGraphProjectionJobData,
  type MemoxSourceCleanupJobData,
} from '../queue';
import { buildBullJobId } from '../queue/queue.utils';
import { VectorPrismaService } from '../vector-prisma';
import { KnowledgeSourceRepository } from './knowledge-source.repository';
import { KnowledgeSourceRevisionRepository } from './knowledge-source-revision.repository';
import { SourceStorageService } from './source-storage.service';

@Injectable()
export class KnowledgeSourceDeletionService {
  private readonly logger = new Logger(KnowledgeSourceDeletionService.name);

  constructor(
    private readonly vectorPrisma: VectorPrismaService,
    private readonly sourceRepository: KnowledgeSourceRepository,
    private readonly revisionRepository: KnowledgeSourceRevisionRepository,
    private readonly storageService: SourceStorageService,
    @InjectQueue(MEMOX_SOURCE_CLEANUP_QUEUE)
    private readonly cleanupQueue: Queue<MemoxSourceCleanupJobData>,
    @InjectQueue(MEMOX_GRAPH_PROJECTION_QUEUE)
    private readonly graphProjectionQueue: Queue<MemoxGraphProjectionJobData>,
  ) {}

  async requestDelete(apiKeyId: string, sourceId: string) {
    const source = await this.sourceRepository.getRequired(apiKeyId, sourceId);
    const deletedSource =
      source.status === 'DELETED'
        ? source
        : await this.sourceRepository.markDeleted(apiKeyId, sourceId);

    try {
      await this.enqueueCleanupJob(apiKeyId, sourceId);
    } catch (error) {
      this.logger.warn(
        `Failed to enqueue source cleanup for ${sourceId}: ${(error as Error).message}`,
      );
    }

    return deletedSource;
  }

  async enqueueCleanupJob(apiKeyId: string, sourceId: string): Promise<void> {
    await this.cleanupQueue.add(
      'cleanup',
      {
        apiKeyId,
        sourceId,
      },
      {
        jobId: buildBullJobId('memox', 'source-cleanup', apiKeyId, sourceId),
      },
    );
  }

  async processCleanupJob(apiKeyId: string, sourceId: string): Promise<void> {
    const source = await this.sourceRepository.findById(apiKeyId, sourceId);
    if (!source || source.status !== 'DELETED') {
      return;
    }

    const derivedFactIds = (
      await this.vectorPrisma.memoryFact.findMany({
        where: {
          apiKeyId,
          sourceId,
          originKind: 'SOURCE_DERIVED',
        },
        select: { id: true },
      })
    ).map((fact) => fact.id);

    const revisions = await this.revisionRepository.findManyBySourceId(
      apiKeyId,
      sourceId,
    );
    const objectKeys = revisions.flatMap((revision) =>
      [revision.normalizedTextR2Key, revision.blobR2Key].filter(
        (value): value is string => Boolean(value),
      ),
    );

    if (objectKeys.length > 0) {
      await this.storageService.deleteObjects(objectKeys);
    }

    if (derivedFactIds.length > 0) {
      await this.vectorPrisma.$transaction(async (tx) => {
        await tx.memoryFactFeedback.deleteMany({
          where: {
            apiKeyId,
            memoryId: { in: derivedFactIds },
          },
        });
        await tx.memoryFact.deleteMany({
          where: {
            apiKeyId,
            id: { in: derivedFactIds },
          },
        });
      });
    }

    const cleanupJobs = [
      ...derivedFactIds.map((memoryId) =>
        this.graphProjectionQueue.add(
          'cleanup-memory-fact',
          {
            kind: 'cleanup_memory_fact' as const,
            apiKeyId,
            memoryId,
          },
          {
            jobId: buildBullJobId(
              'memox',
              'graph',
              'cleanup-memory',
              apiKeyId,
              memoryId,
            ),
          },
        ),
      ),
    ];

    if (cleanupJobs.length > 0) {
      try {
        await Promise.all(cleanupJobs);
      } catch (error) {
        this.logger.warn(
          `Failed to enqueue graph cleanup for ${sourceId}: ${(error as Error).message}`,
        );
      }
    }

    await this.sourceRepository.deleteById(apiKeyId, sourceId);
    this.logger.log(
      `Cleaned up source ${sourceId} for apiKey ${apiKeyId} and removed ${objectKeys.length} storage objects`,
    );
  }
}
