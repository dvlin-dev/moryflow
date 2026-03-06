import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { SourceRevisionsController } from '../source-revisions.controller';
import type { KnowledgeSourceRevisionService } from '../knowledge-source-revision.service';
import type { IdempotencyExecutorService } from '../../idempotency/idempotency-executor.service';
import type { ApiKeyValidationResult } from '../../api-key/api-key.types';

describe('SourceRevisionsController', () => {
  const createController = (overrides?: {
    sourceRevisionsService?: Partial<KnowledgeSourceRevisionService>;
    idempotencyExecutor?: Partial<IdempotencyExecutorService>;
  }) => {
    const sourceRevisionsService = {
      createInlineTextRevision: vi.fn(),
      createUploadBlobRevision: vi.fn(),
      getById: vi.fn(),
      getByRevisionId: vi.fn(),
      finalize: vi.fn(),
      reindex: vi.fn(),
      ...(overrides?.sourceRevisionsService ?? {}),
    } as unknown as KnowledgeSourceRevisionService;

    const idempotencyExecutor = {
      execute: vi.fn(),
      ...(overrides?.idempotencyExecutor ?? {}),
    } as unknown as IdempotencyExecutorService;

    return new SourceRevisionsController(
      sourceRevisionsService,
      idempotencyExecutor,
    );
  };

  const apiKey = {
    id: 'api-key-1',
  } as ApiKeyValidationResult;

  it('requires Idempotency-Key on create revision', async () => {
    const controller = createController();
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/sources/source-1/revisions',
    } as Request;

    await expect(
      controller.createInlineRevision(apiKey, 'source-1', request, '', {
        mode: 'inline_text',
        content: 'hello',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('支持 upload_blob revision 并返回 upload session', async () => {
    const createUploadBlobRevision = vi.fn().mockResolvedValue({
      revision: {
        id: 'revision-1',
        sourceId: 'source-1',
        ingestMode: 'UPLOAD_BLOB',
        checksum: null,
        userId: null,
        agentId: null,
        appId: null,
        runId: null,
        orgId: null,
        projectId: null,
        contentBytes: null,
        contentTokens: null,
        normalizedTextR2Key: null,
        blobR2Key: 'tenant/blob/revision-1',
        mimeType: 'text/markdown',
        status: 'PENDING_UPLOAD',
        error: null,
        createdAt: new Date('2026-03-06T00:00:00.000Z'),
        updatedAt: new Date('2026-03-06T00:00:00.000Z'),
        indexedAt: null,
      },
      uploadSession: {
        uploadUrl: 'https://server.anyhunt.app/api/v1/storage/upload/u/v/f',
        expiresAt: 123456,
        headers: { 'content-type': 'text/markdown' },
        revisionId: 'revision-1',
      },
    });
    const execute = vi
      .fn()
      .mockImplementation(async (options) => options.execute());
    const controller = createController({
      sourceRevisionsService: { createUploadBlobRevision },
      idempotencyExecutor: { execute },
    });
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/sources/source-1/revisions',
    } as Request;

    const result = (await controller.createInlineRevision(
      apiKey,
      'source-1',
      request,
      'idem_blob',
      {
        mode: 'upload_blob',
        mime_type: 'text/markdown',
        filename: 'doc.md',
      } as never,
    )) as { upload_session: { revision_id: string } };

    expect(createUploadBlobRevision).toHaveBeenCalledWith(
      'api-key-1',
      'source-1',
      {
        mimeType: 'text/markdown',
        filename: 'doc.md',
      },
    );
    expect(result.upload_session.revision_id).toBe('revision-1');
  });

  it('支持直接按 revision_id 查询状态', async () => {
    const getByRevisionId = vi.fn().mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      ingestMode: 'UPLOAD_BLOB',
      checksum: null,
      userId: null,
      agentId: null,
      appId: null,
      runId: null,
      orgId: null,
      projectId: null,
      contentBytes: null,
      contentTokens: null,
      normalizedTextR2Key: null,
      blobR2Key: 'tenant/blob/revision-1',
      mimeType: 'text/markdown',
      status: 'PENDING_UPLOAD',
      error: null,
      createdAt: new Date('2026-03-06T00:00:00.000Z'),
      updatedAt: new Date('2026-03-06T00:00:00.000Z'),
      indexedAt: null,
    });
    const controller = createController({
      sourceRevisionsService: { getByRevisionId },
    });

    const result = await controller.getByRevisionId(apiKey, 'revision-1');

    expect(getByRevisionId).toHaveBeenCalledWith('api-key-1', 'revision-1');
    expect(result.id).toBe('revision-1');
    expect(result.status).toBe('PENDING_UPLOAD');
  });

  it('delegates finalize through idempotency executor', async () => {
    const finalize = vi.fn().mockResolvedValue({
      revisionId: 'revision-1',
      sourceId: 'source-1',
      chunkCount: 2,
      contentBytes: 10,
      contentTokens: 4,
      checksum: 'abc',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    const execute = vi.fn().mockImplementation(async (options) => {
      expect(options.scope).toBe(
        'memox:sources:revisions:finalize:api-key-1:revision-1',
      );
      expect(options.idempotencyKey).toBe('idem_finalize');
      expect(options.path).toBe('/api/v1/source-revisions/revision-1/finalize');
      return options.execute();
    });
    const controller = createController({
      sourceRevisionsService: { finalize },
      idempotencyExecutor: { execute },
    });
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/source-revisions/revision-1/finalize',
    } as Request;

    const result = (await controller.finalize(
      apiKey,
      'revision-1',
      request,
      'idem_finalize',
    )) as { revision_id: string };

    expect(finalize).toHaveBeenCalledWith('api-key-1', 'revision-1');
    expect(result.revision_id).toBe('revision-1');
  });
});
