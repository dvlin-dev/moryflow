import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceContentOutboxEventType } from '../../generated/prisma/enums';
import { MemoxWorkspaceContentConsumerService } from './memox-workspace-content-consumer.service';
import { MemoxGatewayError } from './memox.client';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('MemoxWorkspaceContentConsumerService', () => {
  let prismaMock: MockPrismaService;
  let projectionService: {
    upsertDocument: ReturnType<typeof vi.fn>;
    deleteDocument: ReturnType<typeof vi.fn>;
  };
  let service: MemoxWorkspaceContentConsumerService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    projectionService = {
      upsertDocument: vi.fn(() => Promise.resolve(undefined)),
      deleteDocument: vi.fn(() => Promise.resolve(undefined)),
    };
    service = new MemoxWorkspaceContentConsumerService(
      prismaMock as never,
      projectionService as never,
    );
  });

  it('acknowledges a valid UPSERT event and calls markProcessed', async () => {
    prismaMock.workspaceContentOutbox.findMany
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          eventType: WorkspaceContentOutboxEventType.UPSERT,
          payload: {
            mode: 'inline_text',
            userId: 'user-1',
            workspaceId: 'workspace-1',
            documentId: 'doc-1',
            title: 'Doc',
            path: '/Doc.md',
            contentHash: 'hash-1',
            content: '# Hello',
          },
          attemptCount: 0,
          processedAt: null,
          deadLetteredAt: null,
          leasedBy: null,
          leaseExpiresAt: null,
          createdAt: new Date('2026-03-14T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          eventType: WorkspaceContentOutboxEventType.UPSERT,
          payload: {
            mode: 'inline_text',
            userId: 'user-1',
            workspaceId: 'workspace-1',
            documentId: 'doc-1',
            title: 'Doc',
            path: '/Doc.md',
            contentHash: 'hash-1',
            content: '# Hello',
          },
          attemptCount: 1,
          processedAt: null,
          deadLetteredAt: null,
          leasedBy: 'memox-workspace-content-consumer:lease-1',
          leaseExpiresAt: new Date('2026-03-14T00:01:00.000Z'),
          createdAt: new Date('2026-03-14T00:00:00.000Z'),
        },
      ]);
    prismaMock.workspaceContentOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    const result = await service.processBatch({
      consumerId: 'memox-workspace-content-consumer',
      limit: 10,
      leaseMs: 60_000,
    });

    expect(projectionService.upsertDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-1',
        mode: 'inline_text',
        workspaceId: 'workspace-1',
        documentId: 'doc-1',
      }),
    );
    expect(result).toEqual({
      claimed: 1,
      acknowledged: 1,
      failedIds: [],
      deadLetteredIds: [],
    });
  });

  it('schedules retry for a retryable MemoxGatewayError without dead-lettering', async () => {
    projectionService.upsertDocument.mockRejectedValueOnce(
      new MemoxGatewayError('Internal Server Error', 500, 'MEMOX_GATEWAY_ERROR'),
    );

    prismaMock.workspaceContentOutbox.findMany
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          eventType: WorkspaceContentOutboxEventType.UPSERT,
          payload: {
            mode: 'inline_text',
            userId: 'user-1',
            workspaceId: 'workspace-1',
            documentId: 'doc-1',
            title: 'Doc',
            path: '/Doc.md',
            contentHash: 'hash-1',
            content: '# Hello',
          },
          attemptCount: 1,
          processedAt: null,
          deadLetteredAt: null,
          leasedBy: null,
          leaseExpiresAt: null,
          createdAt: new Date('2026-03-14T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          eventType: WorkspaceContentOutboxEventType.UPSERT,
          payload: {
            mode: 'inline_text',
            userId: 'user-1',
            workspaceId: 'workspace-1',
            documentId: 'doc-1',
            title: 'Doc',
            path: '/Doc.md',
            contentHash: 'hash-1',
            content: '# Hello',
          },
          attemptCount: 1,
          processedAt: null,
          deadLetteredAt: null,
          leasedBy: 'memox-workspace-content-consumer:lease-1',
          leaseExpiresAt: new Date('2026-03-14T00:01:00.000Z'),
          createdAt: new Date('2026-03-14T00:00:00.000Z'),
        },
      ]);
    prismaMock.workspaceContentOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    const result = await service.processBatch({
      consumerId: 'memox-workspace-content-consumer',
      limit: 10,
      leaseMs: 60_000,
    });

    expect(result.failedIds).toEqual(['event-1']);
    expect(result.deadLetteredIds).toEqual([]);
    const failureUpdate = prismaMock.workspaceContentOutbox.updateMany.mock
      .calls[1]?.[0] as {
      data: {
        deadLetteredAt: Date | null;
        attemptCount: number;
      };
    };
    expect(failureUpdate.data.deadLetteredAt).toBeNull();
    expect(failureUpdate.data.attemptCount).toBe(2);
  });

  it('dead-letters an event when retry attempts are exhausted (attemptCount reaches MAX_ATTEMPTS)', async () => {
    projectionService.upsertDocument.mockRejectedValueOnce(
      new MemoxGatewayError('Internal Server Error', 500, 'MEMOX_GATEWAY_ERROR'),
    );

    prismaMock.workspaceContentOutbox.findMany
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          eventType: WorkspaceContentOutboxEventType.UPSERT,
          payload: {
            mode: 'inline_text',
            userId: 'user-1',
            workspaceId: 'workspace-1',
            documentId: 'doc-1',
            title: 'Doc',
            path: '/Doc.md',
            contentHash: 'hash-1',
            content: '# Hello',
          },
          attemptCount: 4,
          processedAt: null,
          deadLetteredAt: null,
          leasedBy: null,
          leaseExpiresAt: null,
          createdAt: new Date('2026-03-14T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          eventType: WorkspaceContentOutboxEventType.UPSERT,
          payload: {
            mode: 'inline_text',
            userId: 'user-1',
            workspaceId: 'workspace-1',
            documentId: 'doc-1',
            title: 'Doc',
            path: '/Doc.md',
            contentHash: 'hash-1',
            content: '# Hello',
          },
          attemptCount: 4,
          processedAt: null,
          deadLetteredAt: null,
          leasedBy: 'memox-workspace-content-consumer:lease-1',
          leaseExpiresAt: new Date('2026-03-14T00:01:00.000Z'),
          createdAt: new Date('2026-03-14T00:00:00.000Z'),
        },
      ]);
    prismaMock.workspaceContentOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    const result = await service.processBatch({
      consumerId: 'memox-workspace-content-consumer',
      limit: 10,
      leaseMs: 60_000,
    });

    expect(result.failedIds).toEqual(['event-1']);
    expect(result.deadLetteredIds).toEqual(['event-1']);
    const failureUpdate = prismaMock.workspaceContentOutbox.updateMany.mock
      .calls[1]?.[0] as {
      data: {
        deadLetteredAt: Date | null;
        attemptCount: number;
      };
    };
    expect(failureUpdate.data.deadLetteredAt).toBeInstanceOf(Date);
    expect(failureUpdate.data.attemptCount).toBe(5);
  });

  it('dead-letters invalid payloads immediately instead of retrying them', async () => {
    prismaMock.workspaceContentOutbox.findMany
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          eventType: WorkspaceContentOutboxEventType.UPSERT,
          payload: {
            mode: 'inline_text',
            workspaceId: 'workspace-1',
            documentId: 'doc-1',
          },
          attemptCount: 1,
          processedAt: null,
          deadLetteredAt: null,
          leasedBy: null,
          leaseExpiresAt: null,
          createdAt: new Date('2026-03-14T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          eventType: WorkspaceContentOutboxEventType.UPSERT,
          payload: {
            mode: 'inline_text',
            workspaceId: 'workspace-1',
            documentId: 'doc-1',
          },
          attemptCount: 2,
          processedAt: null,
          deadLetteredAt: null,
          leasedBy: 'memox-workspace-content-consumer:lease-1',
          leaseExpiresAt: new Date('2026-03-14T00:01:00.000Z'),
          createdAt: new Date('2026-03-14T00:00:00.000Z'),
        },
      ]);
    prismaMock.workspaceContentOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    const result = await service.processBatch({
      consumerId: 'memox-workspace-content-consumer',
      limit: 10,
      leaseMs: 60_000,
    });

    expect(projectionService.upsertDocument).not.toHaveBeenCalled();
    expect(result).toEqual({
      claimed: 1,
      acknowledged: 0,
      failedIds: ['event-1'],
      deadLetteredIds: ['event-1'],
    });
    const failureUpdate = prismaMock.workspaceContentOutbox.updateMany.mock
      .calls[1]?.[0] as {
      where: {
        id: string;
        leasedBy: string;
      };
      data: {
        deadLetteredAt: Date | null;
        lastErrorCode: string | null;
      };
    };
    expect(failureUpdate.where.id).toBe('event-1');
    expect(failureUpdate.where.leasedBy).toMatch(
      /^memox-workspace-content-consumer:/,
    );
    expect(failureUpdate.data.deadLetteredAt).toBeInstanceOf(Date);
    expect(failureUpdate.data.lastErrorCode).toBe(
      'WORKSPACE_CONTENT_PAYLOAD_INVALID',
    );
  });
});
