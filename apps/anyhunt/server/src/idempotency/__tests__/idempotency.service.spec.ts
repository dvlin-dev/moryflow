import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../../generated/prisma-main/client';
import { IdempotencyService } from '../idempotency.service';
import { IdempotencyKeyReuseConflictError } from '../idempotency.errors';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let prisma: {
    idempotencyRecord: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      idempotencyRecord: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new IdempotencyService(prisma as any);
  });

  it('starts a new idempotent request when record does not exist', async () => {
    prisma.idempotencyRecord.findUnique.mockResolvedValue(null);
    prisma.idempotencyRecord.create.mockResolvedValue({ id: 'idr_1' });

    const result = await service.begin({
      scope: 'apiKey:key_1',
      idempotencyKey: 'idem_1',
      method: 'POST',
      path: '/api/v1/memories',
      requestHash: 'hash_1',
      ttlSeconds: 60,
    });

    expect(result).toEqual({ kind: 'started', recordId: 'idr_1' });
  });

  it('replays completed response when record exists with same request hash', async () => {
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      id: 'idr_1',
      requestHash: 'hash_1',
      expiresAt: new Date(Date.now() + 60_000),
      status: 'COMPLETED',
      responseStatus: 201,
      responseBody: { id: 'memory_1' },
      resourceType: 'memory',
      resourceId: 'memory_1',
      errorCode: null,
    });

    const result = await service.begin({
      scope: 'apiKey:key_1',
      idempotencyKey: 'idem_1',
      method: 'POST',
      path: '/api/v1/memories',
      requestHash: 'hash_1',
      ttlSeconds: 60,
    });

    expect(result).toEqual({
      kind: 'replay',
      responseStatus: 201,
      responseBody: { id: 'memory_1' },
      resourceType: 'memory',
      resourceId: 'memory_1',
      errorCode: null,
    });
  });

  it('returns processing when same request is already in progress', async () => {
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      id: 'idr_1',
      requestHash: 'hash_1',
      expiresAt: new Date(Date.now() + 60_000),
      status: 'PROCESSING',
    });

    const result = await service.begin({
      scope: 'apiKey:key_1',
      idempotencyKey: 'idem_1',
      method: 'POST',
      path: '/api/v1/memories',
      requestHash: 'hash_1',
      ttlSeconds: 60,
    });

    expect(result).toEqual({ kind: 'processing' });
  });

  it('throws conflict when idempotency key is reused with different request hash', async () => {
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      id: 'idr_1',
      requestHash: 'hash_old',
      expiresAt: new Date(Date.now() + 60_000),
      status: 'COMPLETED',
    });

    await expect(
      service.begin({
        scope: 'apiKey:key_1',
        idempotencyKey: 'idem_1',
        method: 'POST',
        path: '/api/v1/memories',
        requestHash: 'hash_new',
        ttlSeconds: 60,
      }),
    ).rejects.toBeInstanceOf(IdempotencyKeyReuseConflictError);
  });

  it('reuses expired record slot by resetting it to processing', async () => {
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      id: 'idr_1',
      requestHash: 'hash_1',
      expiresAt: new Date(Date.now() - 1000),
      status: 'FAILED',
    });
    prisma.idempotencyRecord.update.mockResolvedValue({ id: 'idr_1' });

    const result = await service.begin({
      scope: 'apiKey:key_1',
      idempotencyKey: 'idem_1',
      method: 'POST',
      path: '/api/v1/memories',
      requestHash: 'hash_1',
      ttlSeconds: 60,
    });

    expect(prisma.idempotencyRecord.update).toHaveBeenCalled();
    expect(result).toEqual({ kind: 'started', recordId: 'idr_1' });
  });

  it('reuses expired record slot even when request hash changed', async () => {
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      id: 'idr_1',
      requestHash: 'hash_old',
      expiresAt: new Date(Date.now() - 1000),
      status: 'FAILED',
    });
    prisma.idempotencyRecord.update.mockResolvedValue({ id: 'idr_1' });

    const result = await service.begin({
      scope: 'apiKey:key_1',
      idempotencyKey: 'idem_1',
      method: 'POST',
      path: '/api/v1/memories',
      requestHash: 'hash_new',
      ttlSeconds: 60,
    });

    expect(prisma.idempotencyRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'idr_1' },
        data: expect.objectContaining({
          requestHash: 'hash_new',
          status: 'PROCESSING',
        }),
      }),
    );
    expect(result).toEqual({ kind: 'started', recordId: 'idr_1' });
  });

  it('returns processing when concurrent first request loses unique-key race', async () => {
    prisma.idempotencyRecord.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'idr_1',
        requestHash: 'hash_1',
        expiresAt: new Date(Date.now() + 60_000),
        status: 'PROCESSING',
      });
    prisma.idempotencyRecord.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`scope`,`idempotencyKey`)',
        { code: 'P2002', clientVersion: 'test' },
      ),
    );

    const result = await service.begin({
      scope: 'apiKey:key_1',
      idempotencyKey: 'idem_1',
      method: 'POST',
      path: '/api/v1/memories',
      requestHash: 'hash_1',
      ttlSeconds: 60,
    });

    expect(result).toEqual({ kind: 'processing' });
  });

  it('marks a record as completed', async () => {
    prisma.idempotencyRecord.update.mockResolvedValue({});

    await service.complete({
      recordId: 'idr_1',
      responseStatus: 201,
      responseBody: { id: 'memory_1' },
      resourceType: 'memory',
      resourceId: 'memory_1',
    });

    expect(prisma.idempotencyRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'idr_1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          responseStatus: 201,
        }),
      }),
    );
  });
});
