import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoxTelemetryService } from './memox-telemetry.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('MemoxTelemetryService', () => {
  let prismaMock: MockPrismaService;
  let service: MemoxTelemetryService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-21T10:00:00.000Z'));
    prismaMock = createPrismaMock();
    service = new MemoxTelemetryService(
      prismaMock as never,
      {
        get: vi.fn(),
      } as never,
    );
  });

  it('aggregates consumer/projection counters and outbox backlog snapshot', async () => {
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    prismaMock.workspaceContentOutbox.findFirst
      .mockResolvedValueOnce({
        createdAt: new Date('2026-03-21T09:55:00.000Z'),
      })
      .mockResolvedValueOnce({
        createdAt: new Date('2026-03-21T09:40:00.000Z'),
      });

    service.recordBatch({
      claimed: 4,
      acknowledged: 3,
      failedIds: ['evt-2'],
      deadLetteredIds: [],
    });
    service.recordFailure({ deadLettered: false, poison: false });
    service.recordFailure({ deadLettered: true, poison: true });
    service.recordUpsertRequest();
    service.recordDeleteRequest();
    service.recordIdentityResolve();
    service.recordIdentityLookup();
    service.recordIdentityLookupMiss();
    service.recordRevisionCreate();
    service.recordRevisionFinalize();
    service.recordUnchangedSkip();
    service.recordSourceDelete();

    const snapshot = await service.getSnapshot();

    expect(snapshot.consumer).toEqual({
      batches: 1,
      claimed: 4,
      acknowledged: 3,
      failed: 2,
      retryScheduled: 1,
      deadLettered: 1,
      poison: 1,
    });
    expect(snapshot.projection).toEqual({
      upsertRequests: 1,
      deleteRequests: 1,
      identityResolves: 1,
      identityLookups: 1,
      identityLookupMisses: 1,
      revisionCreates: 1,
      revisionFinalizes: 1,
      unchangedSkips: 1,
      sourceDeletes: 1,
    });
    expect(snapshot.outbox).toEqual({
      pendingCount: 3,
      deadLetteredCount: 1,
      oldestPendingAgeMs: 300000,
      oldestDeadLetteredAgeMs: 1200000,
    });
  });

  it('resets all in-memory counters', async () => {
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prismaMock.workspaceContentOutbox.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    service.recordBatch({
      claimed: 1,
      acknowledged: 1,
      failedIds: [],
      deadLetteredIds: [],
    });
    service.recordUpsertRequest();
    service.reset();

    const snapshot = await service.getSnapshot();
    expect(snapshot.consumer.claimed).toBe(0);
    expect(snapshot.projection.upsertRequests).toBe(0);
  });
});
