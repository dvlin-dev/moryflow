import { BadRequestException, HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { SourcesController } from '../sources.controller';
import type { KnowledgeSourceService } from '../knowledge-source.service';
import type { KnowledgeSourceDeletionService } from '../knowledge-source-deletion.service';
import type { IdempotencyExecutorService } from '../../idempotency/idempotency-executor.service';
import type { ApiKeyValidationResult } from '../../api-key/api-key.types';

describe('SourcesController', () => {
  const createController = (overrides?: {
    sourcesService?: Partial<KnowledgeSourceService>;
    sourceDeletionService?: Partial<KnowledgeSourceDeletionService>;
    idempotencyExecutor?: Partial<IdempotencyExecutorService>;
  }) => {
    const sourcesService = {
      create: vi.fn(),
      getById: vi.fn(),
      ...(overrides?.sourcesService ?? {}),
    } as unknown as KnowledgeSourceService;
    const sourceDeletionService = {
      requestDelete: vi.fn(),
      ...(overrides?.sourceDeletionService ?? {}),
    } as unknown as KnowledgeSourceDeletionService;

    const idempotencyExecutor = {
      execute: vi.fn(),
      ...(overrides?.idempotencyExecutor ?? {}),
    } as unknown as IdempotencyExecutorService;

    return new SourcesController(
      sourcesService,
      sourceDeletionService,
      idempotencyExecutor,
    );
  };

  const apiKey = {
    id: 'api-key-1',
  } as ApiKeyValidationResult;

  const request = {
    method: 'POST',
    originalUrl: '/api/v1/sources',
  } as Request;

  it('marks source create as 200 OK', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        SourcesController.prototype.create,
      ),
    ).toBe(HttpStatus.OK);
  });

  it('requires Idempotency-Key on create', async () => {
    const controller = createController();

    await expect(
      controller.create(apiKey, request, '', {
        source_type: 'vault_file',
        title: 'Doc',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delegates source creation through idempotency executor', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'source-1',
      sourceType: 'vault_file',
      externalId: null,
      userId: null,
      agentId: null,
      appId: null,
      runId: null,
      orgId: null,
      projectId: null,
      title: 'Doc',
      displayPath: null,
      mimeType: null,
      metadata: null,
      currentRevisionId: null,
      status: 'ACTIVE',
      createdAt: new Date('2026-03-06T00:00:00.000Z'),
      updatedAt: new Date('2026-03-06T00:00:00.000Z'),
    });
    const execute = vi.fn().mockImplementation(async (options) => {
      expect(options.scope).toBe('memox:sources:create:api-key-1');
      expect(options.idempotencyKey).toBe('idem_1');
      expect(options.path).toBe('/api/v1/sources');
      return options.execute();
    });
    const controller = createController({
      sourcesService: { create },
      idempotencyExecutor: { execute },
    });

    const result = await controller.create(apiKey, request, 'idem_1', {
      source_type: 'vault_file',
      title: 'Doc',
    });

    expect(create).toHaveBeenCalledWith('api-key-1', {
      sourceType: 'vault_file',
      externalId: undefined,
      userId: undefined,
      agentId: undefined,
      appId: undefined,
      runId: undefined,
      orgId: undefined,
      projectId: undefined,
      title: 'Doc',
      displayPath: undefined,
      mimeType: undefined,
      metadata: undefined,
    });
    expect(result.id).toBe('source-1');
  });

  it('requires Idempotency-Key on delete', async () => {
    const controller = createController();
    const deleteRequest = {
      method: 'DELETE',
      originalUrl: '/api/v1/sources/source-1',
    } as Request;

    await expect(
      controller.delete(apiKey, 'source-1', deleteRequest, ''),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delegates source deletion through idempotency executor', async () => {
    const requestDelete = vi.fn().mockResolvedValue({
      id: 'source-1',
      sourceType: 'vault_file',
      externalId: null,
      userId: null,
      agentId: null,
      appId: null,
      runId: null,
      orgId: null,
      projectId: null,
      title: 'Doc',
      displayPath: null,
      mimeType: null,
      metadata: null,
      currentRevisionId: 'revision-1',
      status: 'DELETED',
      createdAt: new Date('2026-03-06T00:00:00.000Z'),
      updatedAt: new Date('2026-03-06T00:00:00.000Z'),
    });
    const execute = vi.fn().mockImplementation(async (options) => {
      expect(options.scope).toBe('memox:sources:delete:api-key-1:source-1');
      expect(options.idempotencyKey).toBe('idem_delete');
      expect(options.path).toBe('/api/v1/sources/source-1');
      return options.execute();
    });
    const controller = createController({
      sourceDeletionService: { requestDelete },
      idempotencyExecutor: { execute },
    });
    const deleteRequest = {
      method: 'DELETE',
      originalUrl: '/api/v1/sources/source-1',
    } as Request;

    const result = await controller.delete(
      apiKey,
      'source-1',
      deleteRequest,
      'idem_delete',
    );

    expect(requestDelete).toHaveBeenCalledWith('api-key-1', 'source-1');
    expect(result.status).toBe('DELETED');
  });
});
