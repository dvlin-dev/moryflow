import { describe, expect, it, vi } from 'vitest';
import { MemoxWorkspaceContentDrainService } from './memox-workspace-content-drain.service';

describe('MemoxWorkspaceContentDrainService', () => {
  it('drains bounded batches directly through the consumer service', async () => {
    const consumerService = {
      processBatch: vi
        .fn()
        .mockResolvedValueOnce({
          claimed: 20,
          acknowledged: 20,
          failedIds: [],
          deadLetteredIds: [],
        })
        .mockResolvedValueOnce({
          claimed: 3,
          acknowledged: 3,
          failedIds: [],
          deadLetteredIds: [],
        }),
    };
    const service = new MemoxWorkspaceContentDrainService(
      consumerService as never,
    );

    await service.scheduleDrain();

    expect(consumerService.processBatch).toHaveBeenCalledTimes(2);
    expect(consumerService.processBatch).toHaveBeenNthCalledWith(1, {
      consumerId: 'memox-workspace-content-consumer',
      limit: 20,
      leaseMs: 60_000,
    });
    expect(consumerService.processBatch).toHaveBeenNthCalledWith(2, {
      consumerId: 'memox-workspace-content-consumer',
      limit: 20,
      leaseMs: 60_000,
    });
  });

  it('does not overlap a new drain run while the current one is still active', async () => {
    let releaseFirstBatch: () => void = () => {
      throw new Error('releaseFirstBatch not initialized');
    };
    const firstBatch = new Promise<{
      claimed: number;
      acknowledged: number;
      failedIds: string[];
      deadLetteredIds: string[];
    }>((resolve) => {
      releaseFirstBatch = () =>
        resolve({
          claimed: 0,
          acknowledged: 0,
          failedIds: [],
          deadLetteredIds: [],
        });
    });

    const consumerService = {
      processBatch: vi.fn(() => firstBatch),
    };
    const service = new MemoxWorkspaceContentDrainService(
      consumerService as never,
    );

    const firstRun = service.scheduleDrain();
    const secondRun = service.scheduleDrain();

    expect(consumerService.processBatch).toHaveBeenCalledTimes(1);

    releaseFirstBatch();
    await Promise.all([firstRun, secondRun]);

    expect(consumerService.processBatch).toHaveBeenCalledTimes(1);
  });
});
