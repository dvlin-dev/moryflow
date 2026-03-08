import { beforeEach, describe, expect, it } from 'vitest';
import { FileLifecycleOutboxLeaseService } from './file-lifecycle-outbox-lease.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

type UpdateManyCall = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

describe('FileLifecycleOutboxLeaseService', () => {
  let prismaMock: MockPrismaService;
  let service: FileLifecycleOutboxLeaseService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
        if (typeof callback === 'function') {
          return callback(prismaMock);
        }
        return callback;
      },
    );
    service = new FileLifecycleOutboxLeaseService(prismaMock as never);
  });

  it('claims oldest unprocessed events with a lease', async () => {
    const now = new Date('2026-03-06T10:00:00.000Z');
    const leaseExpiresAt = new Date(now.getTime() + 30_000);
    prismaMock.fileLifecycleOutbox.findMany
      .mockResolvedValueOnce([
        {
          id: 'evt-1',
          userId: 'user-1',
          vaultId: 'vault-1',
          fileId: 'file-1',
          eventType: 'file_upserted',
          payload: { path: 'a.md' },
          createdAt: new Date('2026-03-06T09:00:00.000Z'),
          processedAt: null,
          leasedBy: null,
          leaseExpiresAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'evt-1',
          userId: 'user-1',
          vaultId: 'vault-1',
          fileId: 'file-1',
          eventType: 'file_upserted',
          payload: { path: 'a.md' },
          createdAt: new Date('2026-03-06T09:00:00.000Z'),
          attemptCount: 1,
          lastAttemptAt: now,
          lastErrorCode: null,
          lastErrorMessage: null,
          deadLetteredAt: null,
          processedAt: null,
          leasedBy: 'consumer-a',
          leaseExpiresAt,
        },
      ]);
    prismaMock.fileLifecycleOutbox.updateMany.mockResolvedValue({ count: 1 });

    const claimed = await service.claimPendingBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
      now,
    });

    const updateManyCall = prismaMock.fileLifecycleOutbox.updateMany.mock
      .calls[0]?.[0] as UpdateManyCall | undefined;

    expect(updateManyCall).toMatchObject({
      where: {
        id: { in: ['evt-1'] },
        processedAt: null,
        deadLetteredAt: null,
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
      },
      data: {
        leaseExpiresAt,
        attemptCount: {
          increment: 1,
        },
        lastAttemptAt: now,
      },
    });
    expect(updateManyCall?.data?.leasedBy).toEqual(
      expect.stringMatching(/^consumer-a:/),
    );
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.id).toBe('evt-1');
  });

  it('acks only events leased by the same consumer', async () => {
    prismaMock.fileLifecycleOutbox.updateMany.mockResolvedValue({ count: 2 });

    const count = await service.ackClaimedBatch('consumer-a:lease-1', [
      'evt-1',
      'evt-2',
    ]);

    const updateManyCall = prismaMock.fileLifecycleOutbox.updateMany.mock
      .calls[0]?.[0] as UpdateManyCall | undefined;

    expect(updateManyCall).toMatchObject({
      where: {
        id: { in: ['evt-1', 'evt-2'] },
        processedAt: null,
        leasedBy: 'consumer-a:lease-1',
      },
      data: {
        leasedBy: null,
        leaseExpiresAt: null,
      },
    });
    expect(updateManyCall?.data?.processedAt).toBeInstanceOf(Date);
    expect(count).toBe(2);
  });

  it('schedules retryable failures with outbox-native backoff', async () => {
    prismaMock.fileLifecycleOutbox.updateMany.mockResolvedValue({ count: 1 });
    const now = new Date('2026-03-07T00:00:00.000Z');

    const result = await service.failClaimedEvent({
      leaseOwner: 'consumer-a:lease-1',
      id: 'evt-1',
      attemptCount: 2,
      errorCode: 'MEMOX_GATEWAY_ERROR',
      errorMessage: 'gateway timeout',
      retryable: true,
      now,
    });

    expect(result).toEqual({
      state: 'retry_scheduled',
      retryAt: new Date('2026-03-07T00:00:10.000Z'),
    });
    expect(prismaMock.fileLifecycleOutbox.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'evt-1',
        processedAt: null,
        leasedBy: 'consumer-a:lease-1',
      },
      data: {
        leasedBy: null,
        leaseExpiresAt: new Date('2026-03-07T00:00:10.000Z'),
        lastErrorCode: 'MEMOX_GATEWAY_ERROR',
        lastErrorMessage: 'gateway timeout',
        deadLetteredAt: null,
      },
    });
  });

  it('dead-letters poison events when retry is not allowed', async () => {
    prismaMock.fileLifecycleOutbox.updateMany.mockResolvedValue({ count: 1 });
    const now = new Date('2026-03-07T00:00:00.000Z');

    const result = await service.failClaimedEvent({
      leaseOwner: 'consumer-a:lease-1',
      id: 'evt-1',
      attemptCount: 1,
      errorCode: 'OUTBOX_PAYLOAD_INVALID',
      errorMessage: 'Invalid outbox payload: file_upserted.path',
      retryable: false,
      now,
    });

    expect(result).toEqual({
      state: 'dead_lettered',
      retryAt: null,
    });
    expect(prismaMock.fileLifecycleOutbox.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'evt-1',
        processedAt: null,
        leasedBy: 'consumer-a:lease-1',
      },
      data: {
        leasedBy: null,
        leaseExpiresAt: null,
        lastErrorCode: 'OUTBOX_PAYLOAD_INVALID',
        lastErrorMessage: 'Invalid outbox payload: file_upserted.path',
        deadLetteredAt: now,
      },
    });
  });
});
