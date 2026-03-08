/**
 * [INPUT]: ApiKey cleanup task id + apiKeyId
 * [OUTPUT]: durable tenant teardown for Memox vector/source/graph data
 * [POS]: API Key 删除后的异步清理服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  MEMOX_API_KEY_CLEANUP_QUEUE,
  type MemoxApiKeyCleanupJobData,
} from '../queue';
import { MemoxTenantTeardownService } from '../memox-platform';

const API_KEY_CLEANUP_RECOVERY_CRON = '0 */5 * * * *';

@Injectable()
export class ApiKeyCleanupService {
  private readonly logger = new Logger(ApiKeyCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoxTenantTeardownService: MemoxTenantTeardownService,
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
      await this.memoxTenantTeardownService.deleteApiKeyTenant(apiKeyId);

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
