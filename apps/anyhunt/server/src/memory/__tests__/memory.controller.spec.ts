import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { MemoryController } from '../memory.controller';
import type { MemoryOverviewService } from '../memory-overview.service';
import type { MemoryService } from '../memory.service';
import type { IdempotencyExecutorService } from '../../idempotency/idempotency-executor.service';
import type { ApiKeyValidationResult } from '../../api-key/api-key.types';
import type { CurrentUserDto } from '../../types';

describe('MemoryController', () => {
  const createController = (overrides?: {
    memoryService?: Partial<MemoryService>;
    memoryOverviewService?: Partial<MemoryOverviewService>;
    idempotencyExecutor?: Partial<IdempotencyExecutorService>;
  }) => {
    const memoryService = {
      create: vi.fn(),
      ...(overrides?.memoryService ?? {}),
    } as unknown as MemoryService;
    const memoryOverviewService = {
      getOverview: vi.fn(),
      ...(overrides?.memoryOverviewService ?? {}),
    } as unknown as MemoryOverviewService;

    const idempotencyExecutor = {
      execute: vi.fn(),
      ...(overrides?.idempotencyExecutor ?? {}),
    } as unknown as IdempotencyExecutorService;

    return new MemoryController(
      memoryService,
      memoryOverviewService,
      idempotencyExecutor,
    );
  };

  const user: CurrentUserDto = {
    id: 'platform-user-1',
    email: 'demo@example.com',
    name: 'Demo',
    subscriptionTier: 'FREE',
    isAdmin: false,
  };

  const apiKey = {
    id: 'api-key-1',
    user: user,
  } as ApiKeyValidationResult;

  const request = {
    method: 'POST',
    originalUrl: '/api/v1/memories',
  } as Request;

  const dto = {
    messages: [{ role: 'user', content: 'I like coffee' }],
    infer: false,
    output_format: 'v1.1',
    async_mode: false,
    immutable: false,
    enable_graph: false,
  };

  it('requires Idempotency-Key on create', async () => {
    const controller = createController();

    await expect(
      controller.create(user, apiKey, request, '', dto as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delegates memory creation through idempotency executor', async () => {
    const memoryCreate = vi
      .fn()
      .mockResolvedValue({ results: [{ id: 'memory-1' }] });
    const execute = vi.fn().mockImplementation(async (options) => {
      expect(options.scope).toBe('memox:memories:create:api-key-1');
      expect(options.idempotencyKey).toBe('idem_1');
      expect(options.method).toBe('POST');
      expect(options.path).toBe('/api/v1/memories');
      expect(options.requestBody).toEqual(dto);
      return options.execute();
    });
    const controller = createController({
      memoryService: { create: memoryCreate },
      idempotencyExecutor: { execute },
    });

    const result = await controller.create(
      user,
      apiKey,
      request,
      'idem_1',
      dto as any,
    );

    expect(memoryCreate).toHaveBeenCalledWith(
      'platform-user-1',
      'api-key-1',
      dto,
    );
    expect(result).toEqual({ results: [{ id: 'memory-1' }] });
  });
});
