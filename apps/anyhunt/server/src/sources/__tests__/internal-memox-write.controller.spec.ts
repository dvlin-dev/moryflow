import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { ApiKeyValidationResult } from '../../api-key/api-key.types';
import type { IdempotencyExecutorService } from '../../idempotency/idempotency-executor.service';
import type { KnowledgeSourceDeletionService } from '../knowledge-source-deletion.service';
import type { KnowledgeSourceRevisionService } from '../knowledge-source-revision.service';
import type { KnowledgeSourceService } from '../knowledge-source.service';
import { InternalMemoxWriteController } from '../internal-memox-write.controller';

describe('InternalMemoxWriteController', () => {
  const createController = (overrides?: {
    sourcesService?: Partial<KnowledgeSourceService>;
    sourceDeletionService?: Partial<KnowledgeSourceDeletionService>;
    sourceRevisionsService?: Partial<KnowledgeSourceRevisionService>;
    idempotencyExecutor?: Partial<IdempotencyExecutorService>;
  }) => {
    const sourcesService = {
      getIdentity: vi.fn(),
      resolveIdentity: vi.fn(),
      ...(overrides?.sourcesService ?? {}),
    } as unknown as KnowledgeSourceService;
    const sourceDeletionService = {
      requestDelete: vi.fn(),
      ...(overrides?.sourceDeletionService ?? {}),
    } as unknown as KnowledgeSourceDeletionService;
    const sourceRevisionsService = {
      createInlineTextRevision: vi.fn(),
      createUploadBlobRevision: vi.fn(),
      finalize: vi.fn(),
      ...(overrides?.sourceRevisionsService ?? {}),
    } as unknown as KnowledgeSourceRevisionService;
    const idempotencyExecutor = {
      execute: vi.fn(),
      ...(overrides?.idempotencyExecutor ?? {}),
    } as unknown as IdempotencyExecutorService;

    return new InternalMemoxWriteController(
      sourcesService,
      sourceDeletionService,
      sourceRevisionsService,
      idempotencyExecutor,
    );
  };

  const apiKey = {
    id: 'api-key-1',
  } as ApiKeyValidationResult;

  it('requires Idempotency-Key on createInlineRevision', async () => {
    const controller = createController();
    const request = {
      method: 'POST',
      originalUrl: '/internal/memox/sources/source-1/revisions',
    } as Request;

    await expect(
      controller.createInlineRevision(apiKey, 'source-1', request, '', {
        mode: 'inline_text',
        content: 'hello world',
        mime_type: 'text/plain',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enables 5xx retry semantics for internal revision create', async () => {
    const execute = vi.fn().mockImplementation(async (options) => {
      expect(options.scope).toBe(
        'internal:memox:sources:revisions:create:api-key-1:source-1',
      );
      expect(options.idempotencyKey).toBe('idem_create');
      expect(options.path).toBe('/internal/memox/sources/source-1/revisions');
      expect(options.retryFailedResponseStatusesGte).toBe(500);
      return { revision_id: 'rev-1' };
    });
    const controller = createController({
      idempotencyExecutor: { execute },
    });
    const request = {
      method: 'POST',
      originalUrl: '/internal/memox/sources/source-1/revisions',
    } as Request;

    const result = await controller.createInlineRevision(
      apiKey,
      'source-1',
      request,
      'idem_create',
      {
        mode: 'inline_text',
        content: 'hello world',
        mime_type: 'text/plain',
      },
    );

    expect(result).toEqual({ revision_id: 'rev-1' });
  });

  it('requires Idempotency-Key on finalize', async () => {
    const controller = createController();
    const request = {
      method: 'POST',
      originalUrl: '/internal/memox/source-revisions/rev-1/finalize',
    } as Request;

    await expect(
      controller.finalize(apiKey, 'rev-1', request, ''),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enables 5xx retry semantics for internal revision finalize', async () => {
    const execute = vi.fn().mockImplementation(async (options) => {
      expect(options.scope).toBe(
        'internal:memox:sources:revisions:finalize:api-key-1:rev-1',
      );
      expect(options.idempotencyKey).toBe('idem_finalize');
      expect(options.path).toBe(
        '/internal/memox/source-revisions/rev-1/finalize',
      );
      expect(options.retryFailedResponseStatusesGte).toBe(500);
      return { revision_id: 'rev-1', source_id: 'source-1', chunk_count: 24 };
    });
    const controller = createController({
      idempotencyExecutor: { execute },
    });
    const request = {
      method: 'POST',
      originalUrl: '/internal/memox/source-revisions/rev-1/finalize',
    } as Request;

    const result = await controller.finalize(
      apiKey,
      'rev-1',
      request,
      'idem_finalize',
    );

    expect(result).toEqual({
      revision_id: 'rev-1',
      source_id: 'source-1',
      chunk_count: 24,
    });
  });
});
