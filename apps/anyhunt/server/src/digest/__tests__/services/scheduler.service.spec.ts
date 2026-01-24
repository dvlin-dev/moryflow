/**
 * DigestSchedulerService unit tests
 *
 * [PROVIDES]: Repeatable job registration on startup
 * [POS]: Digest scheduler bootstrapping
 */

import { describe, it, expect } from 'vitest';
import { DigestSchedulerService } from '../../services/scheduler.service';
import { createMockQueue } from '../mocks/services.mock';

describe('DigestSchedulerService', () => {
  it('should ensure repeatable scheduler jobs on startup', async () => {
    const subscriptionQueue = createMockQueue();
    const sourceQueue = createMockQueue();

    const service = new DigestSchedulerService(
      subscriptionQueue as any,
      sourceQueue as any,
    );

    await service.onModuleInit();

    expect(subscriptionQueue.add).toHaveBeenCalledWith(
      'schedule',
      {},
      expect.objectContaining({
        jobId: 'digest-subscription-scheduler',
        repeat: { every: 60000 },
      }),
    );
    expect(sourceQueue.add).toHaveBeenCalledWith(
      'schedule',
      {},
      expect.objectContaining({
        jobId: 'digest-source-scheduler',
        repeat: { every: 60000 },
      }),
    );
  });
});
