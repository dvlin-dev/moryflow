import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GraphRebuildService } from '../graph-rebuild.service';
import type { RedisService } from '../../redis/redis.service';

describe('GraphRebuildService', () => {
  let vectorPrisma: any;
  let graphScopeService: any;
  let graphProjectionService: any;
  let rebuildQueue: any;
  let redisService: any;
  let service: GraphRebuildService;

  beforeEach(() => {
    vectorPrisma = {
      graphProjectionRun: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      graphScope: {
        update: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
      memoryFact: {
        count: vi.fn(),
        updateMany: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      graphObservation: {
        count: vi.fn(),
        deleteMany: vi.fn(),
      },
      graphRelation: {
        deleteMany: vi.fn(),
      },
      graphEntity: {
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return await arg({
            graphProjectionRun: vectorPrisma.graphProjectionRun,
            graphScope: vectorPrisma.graphScope,
          });
        }
        return arg;
      }),
    };

    graphScopeService = {
      ensureScope: vi.fn(),
      requireScope: vi.fn(),
    };
    graphProjectionService = {
      projectMemoryFact: vi.fn(),
    };
    rebuildQueue = {
      add: vi.fn(),
    };
    redisService = {
      setnx: vi.fn().mockResolvedValue(true),
      compareAndDelete: vi.fn().mockResolvedValue(true),
    } as unknown as RedisService;

    service = new GraphRebuildService(
      vectorPrisma,
      graphScopeService,
      graphProjectionService,
      redisService,
      rebuildQueue,
    );
  });

  it('creates a queued rebuild run and enqueues a scope rebuild job', async () => {
    const scope = {
      id: 'scope-1',
      apiKeyId: 'api-key-1',
      projectId: 'project-1',
      projectionStatus: 'IDLE',
      lastProjectedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    };
    graphScopeService.ensureScope.mockResolvedValue(scope);
    vectorPrisma.graphProjectionRun.findFirst.mockResolvedValue(null);
    vectorPrisma.memoryFact.count.mockResolvedValue(3);
    vectorPrisma.graphProjectionRun.create.mockResolvedValue({
      id: 'run-1',
      graphScopeId: 'scope-1',
      kind: 'GRAPH_SCOPE_REBUILD',
      status: 'QUEUED',
      totalItems: 3,
      processedItems: 0,
      failedItems: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
    });
    vectorPrisma.graphScope.findUniqueOrThrow.mockResolvedValue({
      ...scope,
      projectionStatus: 'BUILDING',
    });

    const result = await service.startRebuild('api-key-1', {
      scope: { project_id: 'project-1' },
    });

    expect(graphScopeService.ensureScope).toHaveBeenCalledWith(
      'api-key-1',
      'project-1',
    );
    expect(vectorPrisma.graphProjectionRun.create).toHaveBeenCalledWith({
      data: {
        graphScopeId: 'scope-1',
        kind: 'GRAPH_SCOPE_REBUILD',
        status: 'QUEUED',
        totalItems: 3,
        processedItems: 0,
        failedItems: 0,
      },
    });
    expect(rebuildQueue.add).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      run_id: 'run-1',
      status: 'queued',
      total_items: 3,
      processed_items: 0,
      failed_items: 0,
      last_error_code: null,
      last_error_message: null,
      last_projected_at: null,
    });
    expect(redisService.setnx).toHaveBeenCalledTimes(1);
    expect(redisService.compareAndDelete).toHaveBeenCalledTimes(1);
  });

  it('returns the existing active run when a concurrent start already holds the scope lease', async () => {
    const scope = {
      id: 'scope-1',
      apiKeyId: 'api-key-1',
      projectId: 'project-1',
      projectionStatus: 'BUILDING',
      lastProjectedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    };
    graphScopeService.ensureScope.mockResolvedValue(scope);
    redisService.setnx.mockResolvedValueOnce(false);
    vectorPrisma.graphProjectionRun.findFirst.mockResolvedValueOnce({
      id: 'run-1',
      graphScopeId: 'scope-1',
      kind: 'GRAPH_SCOPE_REBUILD',
      status: 'QUEUED',
      totalItems: 3,
      processedItems: 0,
      failedItems: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
    });

    const result = await service.startRebuild('api-key-1', {
      scope: { project_id: 'project-1' },
    });

    expect(vectorPrisma.graphProjectionRun.create).not.toHaveBeenCalled();
    expect(rebuildQueue.add).not.toHaveBeenCalled();
    expect(result).toEqual({
      run_id: 'run-1',
      status: 'queued',
      total_items: 3,
      processed_items: 0,
      failed_items: 0,
      last_error_code: null,
      last_error_message: null,
      last_projected_at: null,
    });
  });

  it('rebuilds one graph scope from scoped memory facts and marks the run completed', async () => {
    const now = new Date('2026-03-20T09:00:00.000Z');
    const scope = {
      id: 'scope-1',
      apiKeyId: 'api-key-1',
      projectId: 'project-1',
      projectionStatus: 'BUILDING',
      lastProjectedAt: now,
      lastErrorCode: null,
      lastErrorMessage: null,
    };

    vectorPrisma.graphProjectionRun.findUnique.mockResolvedValue({
      id: 'run-1',
      graphScopeId: 'scope-1',
      status: 'QUEUED',
      totalItems: 2,
      processedItems: 0,
      failedItems: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
      graphScope: scope,
    });
    vectorPrisma.memoryFact.findMany
      .mockResolvedValueOnce([{ id: 'memory-1' }, { id: 'memory-2' }])
      .mockResolvedValueOnce([]);
    vectorPrisma.graphObservation.count.mockResolvedValue(2);
    vectorPrisma.graphScope.findUniqueOrThrow.mockResolvedValue(scope);
    vectorPrisma.graphProjectionRun.findUniqueOrThrow.mockResolvedValue({
      id: 'run-1',
      graphScopeId: 'scope-1',
      status: 'COMPLETED',
      totalItems: 2,
      processedItems: 2,
      failedItems: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
    });

    const result = await service.processRun({
      runId: 'run-1',
      graphScopeId: 'scope-1',
      apiKeyId: 'api-key-1',
    });

    expect(vectorPrisma.graphObservation.deleteMany).toHaveBeenCalledWith({
      where: { graphScopeId: 'scope-1' },
    });
    expect(graphProjectionService.projectMemoryFact).toHaveBeenNthCalledWith(
      1,
      'api-key-1',
      'memory-1',
    );
    expect(graphProjectionService.projectMemoryFact).toHaveBeenNthCalledWith(
      2,
      'api-key-1',
      'memory-2',
    );
    expect(result.status).toBe('completed');
    expect(result.processed_items).toBe(2);
    expect(result.failed_items).toBe(0);
  });

  it('marks the run failed when one or more scoped memory facts fail to project', async () => {
    const scope = {
      id: 'scope-1',
      apiKeyId: 'api-key-1',
      projectId: 'project-1',
      projectionStatus: 'FAILED',
      lastProjectedAt: null,
      lastErrorCode: 'GRAPH_PROJECTION_FAILED',
      lastErrorMessage: 'llm timeout',
    };

    vectorPrisma.graphProjectionRun.findUnique.mockResolvedValue({
      id: 'run-1',
      graphScopeId: 'scope-1',
      status: 'QUEUED',
      totalItems: 2,
      processedItems: 0,
      failedItems: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
      graphScope: scope,
    });
    vectorPrisma.memoryFact.findMany
      .mockResolvedValueOnce([{ id: 'memory-1' }, { id: 'memory-2' }])
      .mockResolvedValueOnce([]);
    graphProjectionService.projectMemoryFact
      .mockRejectedValueOnce(new Error('llm timeout'))
      .mockResolvedValueOnce(undefined);
    vectorPrisma.graphScope.findUniqueOrThrow.mockResolvedValue(scope);
    vectorPrisma.graphProjectionRun.findUniqueOrThrow.mockResolvedValue({
      id: 'run-1',
      graphScopeId: 'scope-1',
      status: 'FAILED',
      totalItems: 2,
      processedItems: 1,
      failedItems: 1,
      lastErrorCode: 'GRAPH_PROJECTION_FAILED',
      lastErrorMessage: 'llm timeout',
    });

    const result = await service.processRun({
      runId: 'run-1',
      graphScopeId: 'scope-1',
      apiKeyId: 'api-key-1',
    });

    expect(vectorPrisma.memoryFact.update).toHaveBeenCalledWith({
      where: { id: 'memory-1' },
      data: {
        graphProjectionState: 'FAILED',
        graphProjectionErrorCode: 'GRAPH_PROJECTION_FAILED',
      },
    });
    expect(result.status).toBe('failed');
    expect(result.failed_items).toBe(1);
    expect(result.last_error_message).toBe('llm timeout');
  });
});
