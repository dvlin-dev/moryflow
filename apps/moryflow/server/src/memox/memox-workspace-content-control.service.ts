import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  MEMOX_WORKSPACE_CONTENT_BATCH_LIMIT,
  MEMOX_WORKSPACE_CONTENT_CONSUMER_ID,
  MEMOX_WORKSPACE_CONTENT_LEASE_MS,
  MEMOX_WORKSPACE_CONTENT_MAX_BATCHES,
} from './memox-workspace-content.constants';
import { MemoxWorkspaceContentConsumerService } from './memox-workspace-content-consumer.service';

export interface MemoxWorkspaceContentReplayOptions {
  batchSize?: number;
  maxBatches?: number;
  leaseMs?: number;
  consumerId?: string;
}

export interface MemoxWorkspaceContentReplayResult {
  claimed: number;
  acknowledged: number;
  failedIds: string[];
  deadLetteredIds: string[];
  drained: boolean;
  pendingCount: number;
  deadLetteredCount: number;
}

@Injectable()
export class MemoxWorkspaceContentControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consumerService: MemoxWorkspaceContentConsumerService,
  ) {}

  async redriveDeadLetters(limit: number): Promise<number> {
    if (limit <= 0) {
      return 0;
    }

    const candidates = await this.prisma.workspaceContentOutbox.findMany({
      where: {
        deadLetteredAt: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
      select: {
        id: true,
      },
    });

    const ids = candidates.map((candidate) => candidate.id);
    if (ids.length === 0) {
      return 0;
    }

    const result = await this.prisma.workspaceContentOutbox.updateMany({
      where: {
        id: {
          in: ids,
        },
        deadLetteredAt: {
          not: null,
        },
      },
      data: {
        attemptCount: 0,
        processedAt: null,
        deadLetteredAt: null,
        leasedBy: null,
        leaseExpiresAt: null,
        lastAttemptAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });

    return result.count;
  }

  async replayOutbox(
    options: MemoxWorkspaceContentReplayOptions = {},
  ): Promise<MemoxWorkspaceContentReplayResult> {
    const batchSize = options.batchSize ?? MEMOX_WORKSPACE_CONTENT_BATCH_LIMIT;
    const maxBatches =
      options.maxBatches ?? MEMOX_WORKSPACE_CONTENT_MAX_BATCHES;
    const leaseMs = options.leaseMs ?? MEMOX_WORKSPACE_CONTENT_LEASE_MS;
    const consumerId =
      options.consumerId ?? MEMOX_WORKSPACE_CONTENT_CONSUMER_ID;
    const failedIds: string[] = [];
    const deadLetteredIds: string[] = [];
    let claimed = 0;
    let acknowledged = 0;

    for (let batch = 0; batch < maxBatches; batch += 1) {
      const result = await this.consumerService.processBatch({
        consumerId,
        limit: batchSize,
        leaseMs,
      });
      claimed += result.claimed;
      acknowledged += result.acknowledged;
      failedIds.push(...result.failedIds);
      deadLetteredIds.push(...result.deadLetteredIds);

      if (result.claimed < batchSize) {
        break;
      }
    }

    const backlog = await this.getBacklogState();

    return {
      claimed,
      acknowledged,
      failedIds,
      deadLetteredIds,
      drained: backlog.pendingCount === 0 && backlog.deadLetteredCount === 0,
      pendingCount: backlog.pendingCount,
      deadLetteredCount: backlog.deadLetteredCount,
    };
  }

  private async getBacklogState(): Promise<{
    pendingCount: number;
    deadLetteredCount: number;
  }> {
    const [pendingCount, deadLetteredCount] = await Promise.all([
      this.prisma.workspaceContentOutbox.count({
        where: {
          processedAt: null,
          deadLetteredAt: null,
        },
      }),
      this.prisma.workspaceContentOutbox.count({
        where: {
          deadLetteredAt: {
            not: null,
          },
        },
      }),
    ]);

    return {
      pendingCount,
      deadLetteredCount,
    };
  }
}
