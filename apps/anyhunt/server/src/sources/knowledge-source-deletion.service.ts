/**
 * [INPUT]: apiKeyId + sourceId
 * [OUTPUT]: 删除请求结果 + cleanup job side effects
 * [POS]: Sources 删除编排服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
import { MemoxPlatformService } from '../memox-platform';
import { KnowledgeSourceRepository } from './knowledge-source.repository';
import { KnowledgeSourceRevisionRepository } from './knowledge-source-revision.repository';
import { SourceStorageService } from './source-storage.service';

@Injectable()
export class KnowledgeSourceDeletionService {
  private readonly logger = new Logger(KnowledgeSourceDeletionService.name);

  constructor(
    private readonly sourceRepository: KnowledgeSourceRepository,
    private readonly revisionRepository: KnowledgeSourceRevisionRepository,
    private readonly storageService: SourceStorageService,
    @InjectQueue(MEMOX_SOURCE_CLEANUP_QUEUE)
    private readonly cleanupQueue: Queue<MemoxSourceCleanupJobData>,
    @InjectQueue(MEMOX_GRAPH_PROJECTION_QUEUE)
    private readonly graphProjectionQueue: Queue<MemoxGraphProjectionJobData>,
    private readonly memoxPlatformService: MemoxPlatformService,
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
        jobId: `memox-source-cleanup:${apiKeyId}:${sourceId}`,
      },
    );
  }

  async processCleanupJob(apiKeyId: string, sourceId: string): Promise<void> {
    const source = await this.sourceRepository.findById(apiKeyId, sourceId);
    if (!source || source.status !== 'DELETED') {
      return;
    }

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

    if (this.memoxPlatformService.isSourceGraphProjectionEnabled()) {
      try {
        await this.graphProjectionQueue.add(
          'cleanup-source',
          {
            kind: 'cleanup_source',
            apiKeyId,
            sourceId,
          },
          {
            jobId: `memox-graph:cleanup-source:${apiKeyId}:${sourceId}`,
          },
        );
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
