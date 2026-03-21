import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoxWorkspaceContentControlService } from './memox-workspace-content-control.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('MemoxWorkspaceContentControlService', () => {
  let prismaMock: MockPrismaService;
  let consumerService: {
    processBatch: ReturnType<typeof vi.fn>;
  };
  let service: MemoxWorkspaceContentControlService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    consumerService = {
      processBatch: vi.fn(),
    };
    service = new MemoxWorkspaceContentControlService(
      prismaMock as never,
      consumerService as never,
    );
  });

  it('replays batches until the batch size is not saturated and reports backlog state', async () => {
    consumerService.processBatch
      .mockResolvedValueOnce({
        claimed: 2,
        acknowledged: 2,
        failedIds: [],
        deadLetteredIds: [],
      })
      .mockResolvedValueOnce({
        claimed: 1,
        acknowledged: 1,
        failedIds: ['evt-3'],
        deadLetteredIds: [],
      });
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    const result = await service.replayOutbox({
      batchSize: 2,
      maxBatches: 5,
      leaseMs: 30_000,
      consumerId: 'manual-replay',
    });

    expect(consumerService.processBatch).toHaveBeenNthCalledWith(1, {
      consumerId: 'manual-replay',
      limit: 2,
      leaseMs: 30_000,
    });
    expect(result).toEqual({
      claimed: 3,
      acknowledged: 3,
      failedIds: ['evt-3'],
      deadLetteredIds: [],
      drained: false,
      pendingCount: 1,
      deadLetteredCount: 0,
    });
  });

  it('redrives dead-lettered outbox events by resetting lease and error state', async () => {
    prismaMock.workspaceContentOutbox.findMany.mockResolvedValue([
      { id: 'evt-1' },
      { id: 'evt-2' },
    ]);
    prismaMock.workspaceContentOutbox.updateMany.mockResolvedValue({
      count: 2,
    });

    const result = await service.redriveDeadLetters(10);

    expect(result).toBe(2);
    expect(prismaMock.workspaceContentOutbox.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['evt-1', 'evt-2'],
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
  });
});
