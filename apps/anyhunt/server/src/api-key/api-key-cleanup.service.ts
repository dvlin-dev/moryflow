/**
 * [INPUT]: ApiKey cleanup task id + apiKeyId
 * [OUTPUT]: durable tenant teardown for Memox vector/source/graph data
 * [POS]: API Key 删除后的异步清理服务
 *
 * [PROTOCOL]: When this file changes, update this header and src/api-key/CLAUDE.md
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { VectorPrismaService } from '../vector-prisma/vector-prisma.service';
import {
  MEMOX_API_KEY_CLEANUP_QUEUE,
  type MemoxApiKeyCleanupJobData,
} from '../queue';
import { SourceStorageService } from '../sources';

const API_KEY_CLEANUP_RECOVERY_CRON = '0 */5 * * * *';

@Injectable()
export class ApiKeyCleanupService {
  private readonly logger = new Logger(ApiKeyCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorPrisma: VectorPrismaService,
    private readonly sourceStorageService: SourceStorageService,
    @InjectQueue(MEMOX_API_KEY_CLEANUP_QUEUE)
    private readonly cleanupQueue: Queue<MemoxApiKeyCleanupJobData>,
  ) {}

  async enqueueTask(taskId: string, apiKeyId: string): Promise<void> {
    await this.cleanupQueue.add(
      'cleanup-api-key',
      { taskId, apiKeyId },
      {
        jobId: `memox-api-key-cleanup:${taskId}`,
      },
    );
  }

  @Cron(API_KEY_CLEANUP_RECOVERY_CRON)
  async recoverPendingTasks(): Promise<void> {
    const tasks = await this.prisma.apiKeyCleanupTask.findMany({
      where: {
        status: {
          in: ['PENDING', 'FAILED'],
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    await Promise.all(
      tasks.map((task) => this.enqueueTask(task.id, task.apiKeyId)),
    );
  }

  async processTask(taskId: string, apiKeyId: string): Promise<void> {
    const task = await this.prisma.apiKeyCleanupTask.findUnique({
      where: { id: taskId },
      select: { id: true, status: true },
    });
    if (!task || task.status === 'COMPLETED') {
      return;
    }

    await this.prisma.apiKeyCleanupTask.update({
      where: { id: taskId },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        startedAt: new Date(),
        lastError: null,
      },
    });

    try {
      const revisions =
        await this.vectorPrisma.knowledgeSourceRevision.findMany({
          where: { apiKeyId },
          select: {
            normalizedTextR2Key: true,
            blobR2Key: true,
          },
        });
      const r2Keys = revisions.flatMap((revision) =>
        [revision.normalizedTextR2Key, revision.blobR2Key].filter(
          (value): value is string => Boolean(value),
        ),
      );

      if (r2Keys.length > 0) {
        await this.sourceStorageService.deleteObjects(r2Keys);
      }

      await this.vectorPrisma.$transaction([
        this.vectorPrisma.graphObservation.deleteMany({ where: { apiKeyId } }),
        this.vectorPrisma.graphRelation.deleteMany({ where: { apiKeyId } }),
        this.vectorPrisma.graphEntity.deleteMany({ where: { apiKeyId } }),
        this.vectorPrisma.sourceChunk.deleteMany({ where: { apiKeyId } }),
        this.vectorPrisma.knowledgeSourceRevision.deleteMany({
          where: { apiKeyId },
        }),
        this.vectorPrisma.knowledgeSource.deleteMany({ where: { apiKeyId } }),
        this.vectorPrisma.memoryFactHistory.deleteMany({ where: { apiKeyId } }),
        this.vectorPrisma.memoryFactFeedback.deleteMany({
          where: { apiKeyId },
        }),
        this.vectorPrisma.memoryFactExport.deleteMany({ where: { apiKeyId } }),
        this.vectorPrisma.scopeRegistry.deleteMany({ where: { apiKeyId } }),
        this.vectorPrisma.memoryFact.deleteMany({ where: { apiKeyId } }),
      ]);

      await this.prisma.apiKeyCleanupTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown cleanup error';
      await this.prisma.apiKeyCleanupTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          lastError: message,
        },
      });
      this.logger.error(
        `ApiKey cleanup failed for task ${taskId} (${apiKeyId}): ${message}`,
      );
      throw error;
    }
  }
}
