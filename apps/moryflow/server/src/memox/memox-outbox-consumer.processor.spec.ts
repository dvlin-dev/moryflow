import { describe, expect, it, vi } from 'vitest';
import { MemoxOutboxConsumerProcessor } from './memox-outbox-consumer.processor';
import type { MemoxOutboxConsumerService } from './memox-outbox-consumer.service';

describe('MemoxOutboxConsumerProcessor', () => {
  it('delegates drain jobs to the consumer service', async () => {
    const processBatch = vi.fn().mockResolvedValue(undefined);
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
