import { BadRequestException, HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { MemoryExportController } from '../memory-export.controller';
import type { MemoryService } from '../memory.service';
import type { IdempotencyExecutorService } from '../../idempotency/idempotency-executor.service';
import type { ApiKeyValidationResult } from '../../api-key/api-key.types';

describe('MemoryExportController', () => {
  const createController = (overrides?: {
    memoryService?: Partial<MemoryService>;
    idempotencyExecutor?: Partial<IdempotencyExecutorService>;
  }) => {
    const memoryService = {
      createExport: vi.fn(),
      getExport: vi.fn(),
      ...(overrides?.memoryService ?? {}),
    } as unknown as MemoryService;

    const idempotencyExecutor = {
      execute: vi.fn(),
      ...(overrides?.idempotencyExecutor ?? {}),
    } as unknown as IdempotencyExecutorService;

    return new MemoryExportController(memoryService, idempotencyExecutor);
  };

  const apiKey = {
    id: 'api-key-1',
  } as ApiKeyValidationResult;

  const request = {
    method: 'POST',
    originalUrl: '/api/v1/exports',
  } as Request;

  const dto = {
    filters: { user_id: 'user-1' },
    org_id: 'org-1',
    project_id: 'project-1',
  };

  it('requires Idempotency-Key on create export', async () => {
    const controller = createController();

    await expect(
      controller.create(apiKey, request, '', dto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delegates export creation through idempotency executor with frozen payload', async () => {
    const createExport = vi
      .fn()
      .mockResolvedValue({ memory_export_id: 'export-1' });
    const execute = vi.fn().mockImplementation(async (options) => {
      expect(options.scope).toBe('memox:memory-exports:create:api-key-1');
      expect(options.idempotencyKey).toBe('idem_1');
      expect(options.method).toBe('POST');
      expect(options.path).toBe('/api/v1/exports');
      expect(options.requestBody).toEqual(dto);
      return options.execute();
    });
    const controller = createController({
      memoryService: { createExport },
      idempotencyExecutor: { execute },
    });

    const result = await controller.create(apiKey, request, 'idem_1', dto);

    expect(createExport).toHaveBeenCalledWith('api-key-1', dto);
    expect(result).toEqual({ memory_export_id: 'export-1' });
  });

  it('declares frozen OpenAPI response schemas for export create and get', () => {
    const createResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      MemoryExportController.prototype.create,
    ) as Record<string, { schema?: { properties?: Record<string, unknown> } }>;
    const getResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      MemoryExportController.prototype.get,
    ) as Record<string, { schema?: { properties?: Record<string, unknown> } }>;

    expect(createResponses['200']?.schema?.properties).toHaveProperty(
      'memory_export_id',
    );
    expect(getResponses['200']?.schema?.properties).toHaveProperty('results');
  });

  it('marks export endpoints as 200 OK', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        MemoryExportController.prototype.create,
      ),
    ).toBe(HttpStatus.OK);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        MemoryExportController.prototype.get,
      ),
    ).toBe(HttpStatus.OK);
  });
});
