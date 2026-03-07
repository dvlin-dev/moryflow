import { describe, expect, it, vi } from 'vitest';
import { MemoxOutboxConsumerProcessor } from './memox-outbox-consumer.processor';
import type { MemoxOutboxConsumerService } from './memox-outbox-consumer.service';

describe('MemoxOutboxConsumerProcessor', () => {
  it('keeps draining while the batch remains full', async () => {
    const processBatch = vi
      .fn()
      .mockResolvedValueOnce({ claimed: 10, acknowledged: 10 })
      .mockResolvedValueOnce({ claimed: 3, acknowledged: 3 });
    const processor = new MemoxOutboxConsumerProcessor({
      processBatch,
    } as unknown as MemoxOutboxConsumerService);

    await processor.process({
      data: {
        consumerId: 'consumer-a',
        limit: 10,
        leaseMs: 30_000,
        maxBatches: 5,
      },
    } as never);

    expect(processBatch).toHaveBeenCalledTimes(2);
  });

  it('delegates drain jobs to the consumer service', async () => {
    const processBatch = vi
      .fn()
      .mockResolvedValue({ claimed: 0, acknowledged: 0 });
    const processor = new MemoxOutboxConsumerProcessor({
      processBatch,
    } as unknown as MemoxOutboxConsumerService);

    await processor.process({
      data: {
        consumerId: 'consumer-a',
        limit: 10,
        leaseMs: 30_000,
      },
    } as never);

    expect(processBatch).toHaveBeenCalledWith({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });
  });
});
