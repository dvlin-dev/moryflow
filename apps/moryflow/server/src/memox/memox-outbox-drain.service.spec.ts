import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoxOutboxDrainService } from './memox-outbox-drain.service';

describe('MemoxOutboxDrainService', () => {
  let queue: {
    add: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    queue = {
      add: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('enqueues a deterministic drain job with retained Bull failure history', async () => {
    const service = new MemoxOutboxDrainService(queue as never);

    await service.scheduleDrain();

    expect(queue.add).toHaveBeenCalledWith(
      'drain',
      {
        consumerId: 'memox-outbox-consumer',
        limit: 20,
        leaseMs: 60000,
        maxBatches: 10,
      },
      {
        jobId: 'memox-outbox-drain',
        removeOnComplete: true,
        removeOnFail: 50,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
  });
});
