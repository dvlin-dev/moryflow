import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { SourceIdentitiesController } from '../source-identities.controller';
import type { KnowledgeSourceService } from '../knowledge-source.service';
import type { IdempotencyExecutorService } from '../../idempotency/idempotency-executor.service';
import type { ApiKeyValidationResult } from '../../api-key/api-key.types';

describe('SourceIdentitiesController', () => {
  const createController = (overrides?: {
    sourcesService?: Partial<KnowledgeSourceService>;
    idempotencyExecutor?: Partial<IdempotencyExecutorService>;
  }) => {
    const sourcesService = {
      resolveIdentity: vi.fn(),
      ...(overrides?.sourcesService ?? {}),
    } as unknown as KnowledgeSourceService;
    const idempotencyExecutor = {
      execute: vi.fn(),
      ...(overrides?.idempotencyExecutor ?? {}),
    } as unknown as IdempotencyExecutorService;

    return new SourceIdentitiesController(sourcesService, idempotencyExecutor);
  };

  const apiKey = {
    id: 'api-key-1',
  } as ApiKeyValidationResult;

  it('requires Idempotency-Key on resolve/upsert', async () => {
    const controller = createController();
    const request = {
      method: 'PUT',
      originalUrl: '/api/v1/source-identities/note_markdown/file-1',
    } as Request;

    await expect(
      controller.resolveIdentity(
        apiKey,
        request,
        '',
        'note_markdown',
        'file-1',
        {
          title: 'Doc',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delegates source identity resolve/upsert through idempotency executor', async () => {
    const resolveIdentity = vi.fn().mockResolvedValue({
      id: 'source-1',
      sourceType: 'note_markdown',
      externalId: 'file-1',
      userId: 'user-1',
      agentId: null,
      appId: null,
      runId: null,
      orgId: null,
      projectId: 'vault-1',
      title: 'Doc',
      displayPath: '/Doc.md',
      mimeType: 'text/markdown',
      metadata: { source_origin: 'moryflow_sync' },
      currentRevisionId: null,
      status: 'ACTIVE',
      createdAt: new Date('2026-03-07T00:00:00.000Z'),
      updatedAt: new Date('2026-03-07T00:00:00.000Z'),
    });
    const execute = vi.fn().mockImplementation(async (options) => {
      expect(options.scope).toBe(
        'memox:source-identities:resolve:api-key-1:note_markdown:file-1',
      );
      expect(options.idempotencyKey).toBe('idem_1');
      expect(options.path).toBe(
        '/api/v1/source-identities/note_markdown/file-1',
      );
      return options.execute();
    });
    const controller = createController({
      sourcesService: { resolveIdentity },
      idempotencyExecutor: { execute },
    });
    const request = {
      method: 'PUT',
      originalUrl: '/api/v1/source-identities/note_markdown/file-1',
    } as Request;

    const result = await controller.resolveIdentity(
      apiKey,
      request,
      'idem_1',
      'note_markdown',
      'file-1',
      {
        title: 'Doc',
        user_id: 'user-1',
        project_id: 'vault-1',
        display_path: '/Doc.md',
        mime_type: 'text/markdown',
        metadata: { source_origin: 'moryflow_sync' },
      },
    );

    expect(resolveIdentity).toHaveBeenCalledWith(
      'api-key-1',
      'note_markdown',
      'file-1',
      {
        title: 'Doc',
        userId: 'user-1',
        agentId: undefined,
        appId: undefined,
        runId: undefined,
        orgId: undefined,
        projectId: 'vault-1',
        displayPath: '/Doc.md',
        mimeType: 'text/markdown',
        metadata: { source_origin: 'moryflow_sync' },
      },
    );
    expect(result).toMatchObject({
      source_id: 'source-1',
      source_type: 'note_markdown',
      external_id: 'file-1',
      project_id: 'vault-1',
      display_path: '/Doc.md',
    });
  });
});
