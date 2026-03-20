import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { randomUUID } from 'node:crypto';
import type { Queue } from 'bullmq';
import type {
  GraphProjectionRun,
  GraphScope,
} from '../../generated/prisma-vector/client';
import { VectorPrismaService } from '../vector-prisma';
import {
  MEMOX_GRAPH_SCOPE_REBUILD_QUEUE,
  type MemoxGraphScopeRebuildJobData,
} from '../queue';
import { buildBullJobId } from '../queue/queue.utils';
import type {
  GraphRebuildStatusDto,
  GraphRebuildTriggerInputDto,
} from './dto/graph.schema';
import { RedisService } from '../redis/redis.service';
import { GraphProjectionService } from './graph-projection.service';
import { createGraphScopeRebuildConflictError } from './graph-rebuild.errors';
import { GraphScopeService } from './graph-scope.service';

const ACTIVE_RUN_STATUSES = ['QUEUED', 'PROCESSING'] as const;
const REBUILD_RUN_KIND = 'GRAPH_SCOPE_REBUILD';
const GRAPH_REBUILD_FAILED_CODE = 'GRAPH_REBUILD_FAILED';
const GRAPH_PROJECTION_FAILED_CODE = 'GRAPH_PROJECTION_FAILED';
const REBUILD_BATCH_SIZE = 100;
const REBUILD_START_LOCK_TTL_SECONDS = 30;

@Injectable()
export class GraphRebuildService {
  private readonly logger = new Logger(GraphRebuildService.name);

  constructor(
    private readonly vectorPrisma: VectorPrismaService,
    private readonly graphScopeService: GraphScopeService,
    private readonly graphProjectionService: GraphProjectionService,
    private readonly redis: RedisService,
    @InjectQueue(MEMOX_GRAPH_SCOPE_REBUILD_QUEUE)
    private readonly rebuildQueue: Queue<MemoxGraphScopeRebuildJobData>,
  ) {}

  async startRebuild(
    apiKeyId: string,
    input: GraphRebuildTriggerInputDto,
  ): Promise<GraphRebuildStatusDto> {
    const scope = await this.graphScopeService.ensureScope(
      apiKeyId,
      input.scope.project_id,
    );

    const lockOwner = randomUUID();
    const lockAcquired = await this.redis.setnx(
      this.buildStartLockKey(scope.id),
      lockOwner,
      REBUILD_START_LOCK_TTL_SECONDS,
    );
    if (!lockAcquired) {
      const concurrentRun =
        await this.vectorPrisma.graphProjectionRun.findFirst({
          where: {
            graphScopeId: scope.id,
            status: { in: [...ACTIVE_RUN_STATUSES] },
          },
          orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
        });
      if (concurrentRun) {
        return this.toRunStatus(concurrentRun, scope);
      }
      throw createGraphScopeRebuildConflictError();
    }

    let run: GraphProjectionRun | null = null;
    try {
      const activeRun = await this.vectorPrisma.graphProjectionRun.findFirst({
        where: {
          graphScopeId: scope.id,
          status: { in: [...ACTIVE_RUN_STATUSES] },
        },
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
      });
      if (activeRun) {
        return this.toRunStatus(activeRun, scope);
      }

      const totalItems = await this.vectorPrisma.memoryFact.count({
        where: { graphScopeId: scope.id },
      });

      run = await this.vectorPrisma.$transaction(async (tx) => {
        const created = await tx.graphProjectionRun.create({
          data: {
            graphScopeId: scope.id,
            kind: REBUILD_RUN_KIND,
            status: 'QUEUED',
            totalItems,
            processedItems: 0,
            failedItems: 0,
          },
        });

        await tx.graphScope.update({
          where: { id: scope.id },
          data: {
            projectionStatus: 'BUILDING',
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        });

        return created;
      });

      await this.rebuildQueue.add(
        'graph-scope-rebuild',
        {
          runId: run.id,
          graphScopeId: scope.id,
          apiKeyId,
        },
        {
          jobId: buildBullJobId('memox', 'graph', 'rebuild', scope.id, run.id),
          attempts: 1,
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );
      const refreshedScope =
        await this.vectorPrisma.graphScope.findUniqueOrThrow({
          where: { id: scope.id },
        });
      return this.toRunStatus(run, refreshedScope);
    } catch (error) {
      if (run) {
        const message = this.toErrorMessage(error);
        await this.finalizeRunFailure({
          runId: run.id,
          graphScopeId: scope.id,
          processedItems: 0,
          failedItems: 0,
          errorCode: GRAPH_REBUILD_FAILED_CODE,
          errorMessage: message,
        });
      }
      throw error;
    } finally {
      await this.redis.compareAndDelete(
        this.buildStartLockKey(scope.id),
        lockOwner,
      );
    }
  }

  async getStatus(
    apiKeyId: string,
    projectId?: string,
  ): Promise<GraphRebuildStatusDto> {
    if (!projectId?.trim()) {
      return {
        run_id: null,
        status: 'idle',
        total_items: 0,
        processed_items: 0,
        failed_items: 0,
        last_error_code: null,
        last_error_message: null,
        last_projected_at: null,
      };
    }

    const scope = await this.graphScopeService.getScope(apiKeyId, projectId);
    if (!scope) {
      return {
        run_id: null,
        status: 'idle',
        total_items: 0,
        processed_items: 0,
        failed_items: 0,
        last_error_code: null,
        last_error_message: null,
        last_projected_at: null,
      };
    }

    const latestRun = await this.vectorPrisma.graphProjectionRun.findFirst({
      where: { graphScopeId: scope.id },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (!latestRun) {
      return this.toIdleStatus(scope);
    }

    return this.toRunStatus(latestRun, scope);
  }

  async processRun(
    data: MemoxGraphScopeRebuildJobData,
  ): Promise<GraphRebuildStatusDto> {
    const run = await this.vectorPrisma.graphProjectionRun.findUnique({
      where: { id: data.runId },
      include: { graphScope: true },
    });

    if (!run) {
      throw new Error(`Graph rebuild run not found: ${data.runId}`);
    }

    const scope = run.graphScope;
    await this.vectorPrisma.$transaction(async (tx) => {
      await tx.graphProjectionRun.update({
        where: { id: run.id },
        data: {
          status: 'PROCESSING',
          processedItems: 0,
          failedItems: 0,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
      await tx.graphScope.update({
        where: { id: scope.id },
        data: {
          projectionStatus: 'BUILDING',
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
    });

    let processedItems = 0;
    let failedItems = 0;
    let lastErrorCode: string | null = null;
    let lastErrorMessage: string | null = null;

    try {
      await this.clearScopeGraph(scope.id);
      await this.vectorPrisma.memoryFact.updateMany({
        where: { graphScopeId: scope.id },
        data: {
          graphProjectionState: 'PENDING',
          graphProjectionErrorCode: null,
        },
      });

      let cursor: string | undefined;
      while (true) {
        const memoryFacts = await this.vectorPrisma.memoryFact.findMany({
          where: { graphScopeId: scope.id },
          select: { id: true },
          orderBy: { id: 'asc' },
          take: REBUILD_BATCH_SIZE,
          ...(cursor
            ? {
                cursor: { id: cursor },
                skip: 1,
              }
            : {}),
        });

        if (memoryFacts.length === 0) {
          break;
        }

        for (const memoryFact of memoryFacts) {
          try {
            await this.graphProjectionService.projectMemoryFact(
              data.apiKeyId,
              memoryFact.id,
              {
                manageScopeLifecycle: false,
              },
            );
            processedItems += 1;
          } catch (error) {
            failedItems += 1;
            lastErrorCode = GRAPH_PROJECTION_FAILED_CODE;
            lastErrorMessage = this.toErrorMessage(error);
            await this.vectorPrisma.memoryFact.update({
              where: { id: memoryFact.id },
              data: {
                graphProjectionState: 'FAILED',
                graphProjectionErrorCode: lastErrorCode,
              },
            });
          }
        }

        cursor = memoryFacts[memoryFacts.length - 1]?.id;

        await this.vectorPrisma.graphProjectionRun.update({
          where: { id: run.id },
          data: {
            processedItems,
            failedItems,
            lastErrorCode,
            lastErrorMessage,
          },
        });
      }

      if (failedItems > 0) {
        await this.finalizeRunFailure({
          runId: run.id,
          graphScopeId: scope.id,
          processedItems,
          failedItems,
          errorCode: lastErrorCode ?? GRAPH_PROJECTION_FAILED_CODE,
          errorMessage:
            lastErrorMessage ??
            'Graph rebuild failed for one or more memory facts',
        });
      } else {
        const observationCount = await this.vectorPrisma.graphObservation.count(
          {
            where: { graphScopeId: scope.id },
          },
        );
        const now = new Date();
        await this.vectorPrisma.$transaction(async (tx) => {
          await tx.graphProjectionRun.update({
            where: { id: run.id },
            data: {
              status: 'COMPLETED',
              totalItems: processedItems,
              processedItems,
              failedItems: 0,
              lastErrorCode: null,
              lastErrorMessage: null,
              finishedAt: now,
            },
          });
          await tx.graphScope.update({
            where: { id: scope.id },
            data: {
              projectionStatus: observationCount > 0 ? 'READY' : 'IDLE',
              lastProjectedAt: now,
              lastErrorCode: null,
              lastErrorMessage: null,
            },
          });
        });
      }
    } catch (error) {
      await this.finalizeRunFailure({
        runId: run.id,
        graphScopeId: scope.id,
        processedItems,
        failedItems,
        errorCode: lastErrorCode ?? GRAPH_REBUILD_FAILED_CODE,
        errorMessage: lastErrorMessage ?? this.toErrorMessage(error),
      });
      throw error;
    }

    const refreshedScope = await this.vectorPrisma.graphScope.findUniqueOrThrow(
      {
        where: { id: scope.id },
      },
    );
    const refreshedRun =
      await this.vectorPrisma.graphProjectionRun.findUniqueOrThrow({
        where: { id: run.id },
      });
    return this.toRunStatus(refreshedRun, refreshedScope);
  }

  private async clearScopeGraph(graphScopeId: string): Promise<void> {
    await this.vectorPrisma.$transaction([
      this.vectorPrisma.graphObservation.deleteMany({
        where: { graphScopeId },
      }),
      this.vectorPrisma.graphRelation.deleteMany({
        where: { graphScopeId },
      }),
      this.vectorPrisma.graphEntity.deleteMany({
        where: { graphScopeId },
      }),
    ]);
  }

  private buildStartLockKey(graphScopeId: string): string {
    return `memox:graph-rebuild-start:${graphScopeId}`;
  }

  private async finalizeRunFailure(params: {
    runId: string;
    graphScopeId: string;
    processedItems: number;
    failedItems: number;
    errorCode: string;
    errorMessage: string;
  }): Promise<void> {
    const now = new Date();
    await this.vectorPrisma.$transaction(async (tx) => {
      await tx.graphProjectionRun.update({
        where: { id: params.runId },
        data: {
          status: 'FAILED',
          processedItems: params.processedItems,
          failedItems: params.failedItems,
          lastErrorCode: params.errorCode,
          lastErrorMessage: params.errorMessage,
          finishedAt: now,
        },
      });
      await tx.graphScope.update({
        where: { id: params.graphScopeId },
        data: {
          projectionStatus: 'FAILED',
          lastErrorCode: params.errorCode,
          lastErrorMessage: params.errorMessage,
        },
      });
    });
  }

  private toIdleStatus(scope: GraphScope): GraphRebuildStatusDto {
    if (scope.projectionStatus === 'FAILED') {
      return {
        run_id: null,
        status: 'failed',
        total_items: 0,
        processed_items: 0,
        failed_items: 0,
        last_error_code: scope.lastErrorCode ?? null,
        last_error_message: scope.lastErrorMessage ?? null,
        last_projected_at: scope.lastProjectedAt?.toISOString() ?? null,
      };
    }

    return {
      run_id: null,
      status: 'idle',
      total_items: 0,
      processed_items: 0,
      failed_items: 0,
      last_error_code: null,
      last_error_message: null,
      last_projected_at: scope.lastProjectedAt?.toISOString() ?? null,
    };
  }

  private toRunStatus(
    run: GraphProjectionRun,
    scope: GraphScope,
  ): GraphRebuildStatusDto {
    return {
      run_id: run.id,
      status: this.mapRunStatus(run.status),
      total_items: run.totalItems,
      processed_items: run.processedItems,
      failed_items: run.failedItems,
      last_error_code: run.lastErrorCode ?? null,
      last_error_message: run.lastErrorMessage ?? null,
      last_projected_at: scope.lastProjectedAt?.toISOString() ?? null,
    };
  }

  private mapRunStatus(status: string): GraphRebuildStatusDto['status'] {
    switch (status) {
      case 'QUEUED':
        return 'queued';
      case 'PROCESSING':
        return 'processing';
      case 'COMPLETED':
        return 'completed';
      case 'FAILED':
        return 'failed';
      default:
        return 'idle';
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
