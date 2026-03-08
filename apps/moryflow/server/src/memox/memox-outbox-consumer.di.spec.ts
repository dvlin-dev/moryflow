import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { FileLifecycleOutboxLeaseService } from '../sync/file-lifecycle-outbox-lease.service';
import { MemoxOutboxConsumerService } from './memox-outbox-consumer.service';
import { MemoxFileProjectionService } from './memox-file-projection.service';

describe('MemoxOutboxConsumerService DI metadata', () => {
  it('should keep runtime constructor param types for Nest injection', () => {
    const paramTypes = Reflect.getMetadata(
      'design:paramtypes',
      MemoxOutboxConsumerService,
    ) as unknown[];

    expect(paramTypes).toEqual([
      FileLifecycleOutboxLeaseService,
      MemoxFileProjectionService,
    ]);
  });
});
