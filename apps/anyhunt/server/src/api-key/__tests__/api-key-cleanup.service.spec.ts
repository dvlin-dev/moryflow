import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiKeyCleanupService } from '../api-key-cleanup.service';

describe('ApiKeyCleanupService', () => {
  let prisma: any;
  let memoxTenantTeardownService: any;
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
    memoxTenantTeardownService = {
      deleteApiKeyTenant: vi.fn().mockResolvedValue(undefined),
    };
    cleanupQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    };

    service = new ApiKeyCleanupService(
      prisma,
      memoxTenantTeardownService,
      cleanupQueue,
    );
  });

  it('processes cleanup task through the Memox tenant teardown boundary', async () => {
    await service.processTask('cleanup-task-1', 'api-key-1');

    expect(memoxTenantTeardownService.deleteApiKeyTenant).toHaveBeenCalledWith(
      'api-key-1',
    );
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
        jobId: 'memox-api-key-cleanup-cleanup-task-1',
      }),
    );
  });
});
