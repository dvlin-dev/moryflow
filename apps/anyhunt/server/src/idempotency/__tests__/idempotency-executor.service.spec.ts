import {
  BadRequestException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IdempotencyExecutorService } from '../idempotency-executor.service';
import { IdempotencyRequestInProgressError } from '../idempotency.errors';
import type { IdempotencyService } from '../idempotency.service';

interface MockCreateResponse {
  results: Array<{ id: string }>;
}

describe('IdempotencyExecutorService', () => {
  const createService = (overrides?: Partial<IdempotencyService>) => {
    const idempotencyService = {
      begin: vi.fn(),
      complete: vi.fn(),
      fail: vi.fn(),
      ...(overrides ?? {}),
    } as unknown as IdempotencyService;

    return {
      idempotencyService,
      service: new IdempotencyExecutorService(idempotencyService),
    };
  };

  it('runs handler and persists completed response when request starts', async () => {
    const execute = vi
      .fn()
      .mockResolvedValue({ results: [{ id: 'memory-1' }] });
    const { service, idempotencyService } = createService({
      begin: vi.fn().mockResolvedValue({ kind: 'started', recordId: 'idr_1' }),
      complete: vi.fn().mockResolvedValue(undefined),
    });

    const result = await service.execute({
      scope: 'memox:memories:create:api-key-1',
      idempotencyKey: 'idem_1',
      method: 'POST',
      path: '/api/v1/memories',
      requestBody: { foo: 'bar' },
      ttlSeconds: 3600,
      execute,
      responseStatus: 200,
      describeResponse: (response: MockCreateResponse) => ({
        resourceType: 'memory',
        resourceId: response.results[0]?.id,
      }),
    });

    expect(result).toEqual({ results: [{ id: 'memory-1' }] });
    expect(execute).toHaveBeenCalledOnce();
    expect(idempotencyService.begin as any).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'memox:memories:create:api-key-1',
        idempotencyKey: 'idem_1',
        method: 'POST',
        path: '/api/v1/memories',
        ttlSeconds: 3600,
        requestHash: expect.any(String),
      }),
    );
    expect(idempotencyService.complete as any).toHaveBeenCalledWith({
      recordId: 'idr_1',
      responseStatus: 200,
      responseBody: { results: [{ id: 'memory-1' }] },
      resourceType: 'memory',
      resourceId: 'memory-1',
    });
  });

  it('returns cached response for replayed request', async () => {
    const execute = vi.fn();
    const { service } = createService({
      begin: vi.fn().mockResolvedValue({
        kind: 'replay',
        responseStatus: 200,
        responseBody: { results: [{ id: 'memory-1' }] },
      }),
    });

    const result = await service.execute({
      scope: 'memox:memories:create:api-key-1',
      idempotencyKey: 'idem_1',
      method: 'POST',
      path: '/api/v1/memories',
      requestBody: { foo: 'bar' },
      ttlSeconds: 3600,
      execute,
      responseStatus: 200,
    });

    expect(result).toEqual({ results: [{ id: 'memory-1' }] });
    expect(execute).not.toHaveBeenCalled();
  });

  it('rethrows cached failure response for replayed failed request', async () => {
    const execute = vi.fn();
    const { service } = createService({
      begin: vi.fn().mockResolvedValue({
        kind: 'replay',
        responseStatus: 409,
        responseBody: {
          code: 'IDEMPOTENCY_KEY_REUSE_CONFLICT',
          message: 'Idempotency key reuse with different request payload',
        },
      }),
    });

    await expect(
      service.execute({
        scope: 'memox:memories:create:api-key-1',
        idempotencyKey: 'idem_1',
        method: 'POST',
        path: '/api/v1/memories',
        requestBody: { foo: 'bar' },
        ttlSeconds: 3600,
        execute,
        responseStatus: 200,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(execute).not.toHaveBeenCalled();
  });

  it('throws conflict when same key is still processing', async () => {
    const { service } = createService({
      begin: vi.fn().mockResolvedValue({ kind: 'processing' }),
    });

    await expect(
      service.execute({
        scope: 'memox:memories:create:api-key-1',
        idempotencyKey: 'idem_1',
        method: 'POST',
        path: '/api/v1/memories',
        requestBody: { foo: 'bar' },
        ttlSeconds: 3600,
        execute: vi.fn(),
        responseStatus: 200,
      }),
    ).rejects.toBeInstanceOf(IdempotencyRequestInProgressError);
  });

  it('marks idempotency record failed when handler throws http exception', async () => {
    const error = new BadRequestException({
      code: 'MEMORY_INVALID',
      message: 'invalid memory payload',
      details: { reason: 'bad_input' },
    });
    const execute = vi.fn().mockRejectedValue(error);
    const { service, idempotencyService } = createService({
      begin: vi.fn().mockResolvedValue({ kind: 'started', recordId: 'idr_1' }),
      fail: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      service.execute({
        scope: 'memox:memories:create:api-key-1',
        idempotencyKey: 'idem_1',
        method: 'POST',
        path: '/api/v1/memories',
        requestBody: { foo: 'bar' },
        ttlSeconds: 3600,
        execute,
        responseStatus: 200,
      }),
    ).rejects.toBe(error);

    expect(idempotencyService.fail as any).toHaveBeenCalledWith({
      recordId: 'idr_1',
      responseStatus: 400,
      responseBody: {
        code: 'MEMORY_INVALID',
        message: 'invalid memory payload',
        details: { reason: 'bad_input' },
      },
      errorCode: 'MEMORY_INVALID',
    });
  });
});
