import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiKeyCleanupService } from '../api-key-cleanup.service';

describe('ApiKeyCleanupService', () => {
  let prisma: any;
  let vectorPrisma: any;
  let sourceStorageService: any;
  let cleanupQueue: any;
  let service: ApiKeyCleanupService;

  beforeEach(() => {
    prisma = {
      apiKeyCleanupTask: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'cleanup-task-1',
          status: 'PENDING',
        }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    };
    vectorPrisma = {
      graphObservation: { deleteMany: vi.fn() },
      graphRelation: { deleteMany: vi.fn() },
      graphEntity: { deleteMany: vi.fn() },
      sourceChunk: { deleteMany: vi.fn() },
      knowledgeSourceRevision: {
        findMany: vi.fn().mockResolvedValue([
          {
            normalizedTextR2Key: 'tenant/text/revision-1',
            blobR2Key: 'tenant/blob/revision-1',
          },
        ]),
        deleteMany: vi.fn(),
      },
      knowledgeSource: { deleteMany: vi.fn() },
      memoryFactHistory: { deleteMany: vi.fn() },
      memoryFactFeedback: { deleteMany: vi.fn() },
      memoryFactExport: { deleteMany: vi.fn() },
      scopeRegistry: { deleteMany: vi.fn() },
      memoryFact: { deleteMany: vi.fn() },
      $transaction: vi.fn().mockResolvedValue(undefined),
    };
    sourceStorageService = {
      deleteObjects: vi.fn().mockResolvedValue(undefined),
    };
    cleanupQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    };

    service = new ApiKeyCleanupService(
      prisma,
      vectorPrisma,
      sourceStorageService,
      cleanupQueue,
    );
  });

  it('processes cleanup task and removes source blobs before vector rows', async () => {
    await service.processTask('cleanup-task-1', 'api-key-1');

    expect(sourceStorageService.deleteObjects).toHaveBeenCalledWith([
      'tenant/text/revision-1',
      'tenant/blob/revision-1',
    ]);
    expect(vectorPrisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.apiKeyCleanupTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cleanup-task-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
        }),
      }),
    );
  });

  it('re-enqueues pending tasks during recovery sweep', async () => {
    prisma.apiKeyCleanupTask.findMany.mockResolvedValue([
      {
        id: 'cleanup-task-1',
        apiKeyId: 'api-key-1',
        status: 'PENDING',
      },
    ]);

    await service.recoverPendingTasks();

    expect(cleanupQueue.add).toHaveBeenCalledWith(
      'cleanup-api-key',
      {
        taskId: 'cleanup-task-1',
        apiKeyId: 'api-key-1',
      },
      expect.objectContaining({
        jobId: 'memox-api-key-cleanup:cleanup-task-1',
      }),
    );
  });
});
