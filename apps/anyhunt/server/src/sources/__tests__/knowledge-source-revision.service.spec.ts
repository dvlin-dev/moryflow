import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { KnowledgeSourceRevisionService } from '../knowledge-source-revision.service';
import { StorageErrorCode, StorageException } from '../../storage';
import type { KnowledgeSourceRepository } from '../knowledge-source.repository';
import type { KnowledgeSourceRevisionRepository } from '../knowledge-source-revision.repository';
import type { SourceChunkRepository } from '../source-chunk.repository';
import type { SourceChunkingService } from '../source-chunking.service';
import type { SourceStorageService } from '../source-storage.service';
import type { EmbeddingService } from '../../embedding';
import type { MemoxPlatformService } from '../../memox-platform';
import type { RedisService } from '../../redis/redis.service';

function createSource() {
  return {
    id: 'source-1',
    apiKeyId: 'api-key-1',
    sourceType: 'vault_file',
    externalId: 'file-1',
    userId: 'user-1',
    agentId: null,
    appId: 'app-1',
    runId: null,
    orgId: null,
    projectId: null,
    title: 'Doc',
    displayPath: '/docs/doc.md',
    mimeType: 'text/markdown',
    metadata: null,
    currentRevisionId: null,
    latestRevisionId: null,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('KnowledgeSourceRevisionService', () => {
  const sourceRepository = {
    activateRevision: vi.fn(),
    getRequired: vi.fn(),
    recordLatestRevision: vi.fn(),
  };
  const revisionRepository = {
    createRevision: vi.fn(),
    getRequired: vi.fn(),
    getRequiredForSource: vi.fn(),
    markProcessing: vi.fn(),
    tryMarkProcessing: vi.fn(),
    markIndexed: vi.fn(),
    markFailed: vi.fn(),
  };
  const chunkRepository = {
    replaceRevisionChunks: vi.fn(),
  };
  const chunkingService = {
    chunkText: vi.fn(),
  };
  const storageService = {
    uploadNormalizedText: vi.fn(),
    downloadText: vi.fn(),
    createUploadSession: vi.fn(),
  };
  const embeddingService = {
    generateBatchEmbeddings: vi.fn(),
  };
  const memoxPlatformService = {
    getSourceIngestGuardrails: vi.fn(),
  };
  const sourceMemoryProjectionQueue = {
    add: vi.fn(),
  };
  const redisService = {
    get: vi.fn(),
    set: vi.fn(),
    setnx: vi.fn(),
    compareAndDelete: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    decr: vi.fn(),
  };

  let service: KnowledgeSourceRevisionService;

  beforeEach(() => {
    vi.resetAllMocks();
    memoxPlatformService.getSourceIngestGuardrails.mockReturnValue({
      maxSourceBytes: 10 * 1024 * 1024,
      maxNormalizedTokensPerRevision: 500_000,
      maxChunksPerRevision: 2_000,
      maxConcurrentSourceJobsPerApiKey: 5,
      maxReindexPerSourcePerWindow: 3,
      reindexWindowSeconds: 86_400,
      maxFinalizeRequestsPerApiKeyPerWindow: 60,
      finalizeWindowSeconds: 3_600,
    });
    redisService.get.mockResolvedValue(null);
    redisService.set.mockResolvedValue(undefined);
    redisService.setnx.mockResolvedValue(true);
    redisService.compareAndDelete.mockResolvedValue(true);
    redisService.del.mockResolvedValue(undefined);
    redisService.incr.mockResolvedValue(1);
    redisService.expire.mockResolvedValue(1);
    redisService.decr.mockResolvedValue(0);
    revisionRepository.tryMarkProcessing.mockResolvedValue(true);

    service = new (KnowledgeSourceRevisionService as any)(
      sourceRepository as unknown as KnowledgeSourceRepository,
      revisionRepository as unknown as KnowledgeSourceRevisionRepository,
      chunkRepository as unknown as SourceChunkRepository,
      chunkingService as unknown as SourceChunkingService,
      storageService as unknown as SourceStorageService,
      embeddingService as unknown as EmbeddingService,
      memoxPlatformService as unknown as MemoxPlatformService,
      sourceMemoryProjectionQueue as unknown as Queue,
      redisService as unknown as RedisService,
    );
  });

  it('创建 inline_text revision 并上传 normalized text', async () => {
    sourceRepository.getRequired.mockResolvedValue(createSource());
    sourceRepository.recordLatestRevision.mockResolvedValue(undefined);
    storageService.uploadNormalizedText.mockResolvedValue(
      'tenant/text/revision-1',
    );
    revisionRepository.createRevision.mockImplementation(
      async (_apiKeyId, input) => ({
        id: input.id,
        sourceId: input.sourceId,
        status: input.status,
        normalizedTextR2Key: input.normalizedTextR2Key,
      }),
    );

    const result = await service.createInlineTextRevision(
      'api-key-1',
      'source-1',
      {
        content: 'Hello\n\nworld',
      },
    );

    expect(storageService.uploadNormalizedText).toHaveBeenCalledOnce();
    expect(revisionRepository.createRevision).toHaveBeenCalledWith(
      'api-key-1',
      expect.objectContaining({
        sourceId: 'source-1',
        ingestMode: 'INLINE_TEXT',
        status: 'READY_TO_FINALIZE',
      }),
    );
    expect(sourceRepository.recordLatestRevision).toHaveBeenCalledWith(
      'api-key-1',
      'source-1',
      result.id,
    );
    expect(result.status).toBe('READY_TO_FINALIZE');
  });

  it('inline_text 超过 source bytes 上限时返回 413 结构化错误', async () => {
    sourceRepository.getRequired.mockResolvedValue(createSource());
    memoxPlatformService.getSourceIngestGuardrails.mockReturnValue({
      maxSourceBytes: 5,
      maxNormalizedTokensPerRevision: 500_000,
      maxChunksPerRevision: 2_000,
      maxConcurrentSourceJobsPerApiKey: 5,
      maxReindexPerSourcePerWindow: 3,
      reindexWindowSeconds: 86_400,
      maxFinalizeRequestsPerApiKeyPerWindow: 60,
      finalizeWindowSeconds: 3_600,
    });

    await expect(
      service.createInlineTextRevision('api-key-1', 'source-1', {
        content: '123456',
      }),
    ).rejects.toMatchObject({
      status: 413,
      response: expect.objectContaining({
        code: 'SOURCE_SIZE_LIMIT_EXCEEDED',
        details: expect.objectContaining({
          guardrail: 'max_source_bytes',
          limit: 5,
          current: 6,
        }),
      }),
    });
  });

  it('rejects heading-only markdown inline_text as no indexable content', async () => {
    sourceRepository.getRequired.mockResolvedValue(createSource());

    await expect(
      service.createInlineTextRevision('api-key-1', 'source-1', {
        content: '# Release Notes',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Source content is required',
      }),
    });

    expect(storageService.uploadNormalizedText).not.toHaveBeenCalled();
    expect(revisionRepository.createRevision).not.toHaveBeenCalled();
  });

  it('创建 upload_blob revision 并返回 upload session', async () => {
    sourceRepository.getRequired.mockResolvedValue(createSource());
    sourceRepository.recordLatestRevision.mockResolvedValue(undefined);
    storageService.createUploadSession.mockReturnValue({
      blobR2Key: 'tenant/blob/revision-1',
      uploadUrl: 'https://server.anyhunt.app/api/v1/storage/upload/u/v/f',
      expiresAt: Date.now() + 60_000,
      headers: { 'content-type': 'text/markdown' },
    });
    revisionRepository.createRevision.mockImplementation(
      async (_apiKeyId, input) => ({
        id: input.id,
        sourceId: input.sourceId,
        status: input.status,
        blobR2Key: input.blobR2Key,
        mimeType: input.mimeType,
      }),
    );

    const result = await service.createUploadBlobRevision(
      'api-key-1',
      'source-1',
      {
        mimeType: 'text/markdown',
        filename: 'doc.md',
      },
    );

    expect(storageService.createUploadSession).toHaveBeenCalledOnce();
    expect(revisionRepository.createRevision).toHaveBeenCalledWith(
      'api-key-1',
      expect.objectContaining({
        sourceId: 'source-1',
        ingestMode: 'UPLOAD_BLOB',
        status: 'PENDING_UPLOAD',
        blobR2Key: 'tenant/blob/revision-1',
      }),
    );
    expect(sourceRepository.recordLatestRevision).toHaveBeenCalledWith(
      'api-key-1',
      'source-1',
      result.revision.id,
    );
    expect(result.uploadSession.uploadUrl).toContain('/api/v1/storage/upload/');
  });

  it('finalize 只入 source-memory projection queue，不再走 source direct graph queue', async () => {
    sourceRepository.getRequired.mockResolvedValue(createSource());
    sourceRepository.activateRevision.mockResolvedValue(undefined);
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      userId: 'user-1',
      agentId: null,
      appId: 'app-1',
      runId: null,
      orgId: null,
      projectId: null,
      status: 'READY_TO_FINALIZE',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    revisionRepository.tryMarkProcessing.mockResolvedValue(true);
    revisionRepository.markIndexed.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    storageService.downloadText.mockResolvedValue('# Title\n\nBody');
    chunkingService.chunkText.mockReturnValue([
      {
        headingPath: ['Title'],
        content: 'Title\n\nBody',
        tokenCount: 10,
        keywords: ['title', 'body'],
      },
    ]);
    embeddingService.generateBatchEmbeddings.mockResolvedValue([
      { embedding: [0.1, 0.2], model: 'mock', dimensions: 2 },
    ]);

    const result = await service.finalize('api-key-1', 'revision-1');

    expect(chunkRepository.replaceRevisionChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyId: 'api-key-1',
        sourceId: 'source-1',
        revisionId: 'revision-1',
      }),
    );
    expect(sourceRepository.activateRevision).toHaveBeenCalledWith(
      'api-key-1',
      'source-1',
      'revision-1',
    );
    expect(redisService.compareAndDelete).toHaveBeenCalledWith(
      'memox:source-processing-lock:api-key-1:source-1',
      expect.any(String),
    );
    expect(sourceMemoryProjectionQueue.add).toHaveBeenCalledWith(
      'project-source-memory-facts',
      {
        apiKeyId: 'api-key-1',
        sourceId: 'source-1',
        revisionId: 'revision-1',
      },
      expect.objectContaining({
        jobId: 'memox-source-memory-api-key-1-source-1-revision-1',
      }),
    );
    expect(result.chunkCount).toBe(1);
  });

  it('空内容 finalize 会把 revision durable 标记为 FAILED', async () => {
    sourceRepository.getRequired.mockResolvedValue(createSource());
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'READY_TO_FINALIZE',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    revisionRepository.tryMarkProcessing.mockResolvedValue(true);
    revisionRepository.markFailed.mockResolvedValue(undefined);
    storageService.downloadText.mockResolvedValue('   ');

    await expect(
      service.finalize('api-key-1', 'revision-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(revisionRepository.markFailed).toHaveBeenCalledWith(
      'api-key-1',
      'revision-1',
      'No indexable text available for indexing',
    );
  });

  it('finalize 在进入 processing 前失败时也必须释放并发槽位', async () => {
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'READY_TO_FINALIZE',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    sourceRepository.getRequired.mockRejectedValue(
      new Error('source lookup failed'),
    );

    await expect(service.finalize('api-key-1', 'revision-1')).rejects.toThrow(
      'source lookup failed',
    );

    expect(redisService.decr).toHaveBeenCalledWith(
      'memox:source-processing:api-key-1',
    );
    expect(revisionRepository.markFailed).not.toHaveBeenCalled();
  });

  it('finalize 超过窗口上限时应直接拒绝', async () => {
    memoxPlatformService.getSourceIngestGuardrails.mockReturnValue({
      maxSourceBytes: 10 * 1024 * 1024,
      maxNormalizedTokensPerRevision: 500_000,
      maxChunksPerRevision: 2_000,
      maxConcurrentSourceJobsPerApiKey: 5,
      maxReindexPerSourcePerWindow: 3,
      reindexWindowSeconds: 86_400,
      maxFinalizeRequestsPerApiKeyPerWindow: 1,
      finalizeWindowSeconds: 3_600,
    });
    redisService.incr.mockResolvedValueOnce(2);
    sourceRepository.getRequired.mockResolvedValue(createSource());
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'READY_TO_FINALIZE',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    storageService.downloadText.mockResolvedValue('# Title\n\nBody');
    chunkingService.chunkText.mockReturnValue([
      {
        headingPath: ['Title'],
        content: 'Title\n\nBody',
        tokenCount: 10,
        keywords: ['title', 'body'],
      },
    ]);
    embeddingService.generateBatchEmbeddings.mockResolvedValue([
      { embedding: [0.1, 0.2], model: 'mock', dimensions: 2 },
    ]);

    await expect(
      service.finalize('api-key-1', 'revision-1'),
    ).rejects.toMatchObject({
      status: 429,
      response: expect.objectContaining({
        code: 'FINALIZE_RATE_LIMIT_EXCEEDED',
        details: expect.objectContaining({
          guardrail: 'max_finalize_requests_per_api_key_per_window',
          limit: 1,
          current: 2,
          retryAfter: 3600,
        }),
      }),
    });
  });

  it('internal finalize 会跳过公网 finalize 窗口限流', async () => {
    memoxPlatformService.getSourceIngestGuardrails.mockReturnValue({
      maxSourceBytes: 10 * 1024 * 1024,
      maxNormalizedTokensPerRevision: 500_000,
      maxChunksPerRevision: 2_000,
      maxConcurrentSourceJobsPerApiKey: 5,
      maxReindexPerSourcePerWindow: 3,
      reindexWindowSeconds: 86_400,
      maxFinalizeRequestsPerApiKeyPerWindow: 1,
      finalizeWindowSeconds: 3_600,
    });
    sourceRepository.getRequired.mockResolvedValue(createSource());
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'READY_TO_FINALIZE',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    revisionRepository.tryMarkProcessing.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'PROCESSING',
      normalizedTextR2Key: 'tenant/text/revision-1',
      blobR2Key: null,
      ingestMode: 'INLINE_TEXT',
    });
    revisionRepository.markIndexed.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'INDEXED',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    sourceRepository.activateRevision.mockResolvedValue(undefined);
    storageService.downloadText.mockResolvedValue('# Title\n\nBody');
    chunkingService.chunkText.mockReturnValue([
      {
        headingPath: ['Title'],
        content: 'Title\n\nBody',
        tokenCount: 10,
        keywords: ['title', 'body'],
      },
    ]);
    embeddingService.generateBatchEmbeddings.mockResolvedValue([
      { embedding: [0.1, 0.2], model: 'mock', dimensions: 2 },
    ]);
    chunkRepository.replaceRevisionChunks.mockResolvedValue(undefined);
    sourceMemoryProjectionQueue.add.mockResolvedValue(undefined as never);

    await expect(
      service.finalize('api-key-1', 'revision-1', {
        bypassFinalizeWindow: true,
      }),
    ).resolves.toMatchObject({
      revisionId: 'revision-1',
      sourceId: 'source-1',
      chunkCount: 1,
    });

    expect(redisService.incr).not.toHaveBeenCalledWith(
      expect.stringContaining('memox:source-finalize:'),
    );
  });

  it('finalize 超过并发 source job 上限时应直接拒绝', async () => {
    memoxPlatformService.getSourceIngestGuardrails.mockReturnValue({
      maxSourceBytes: 10 * 1024 * 1024,
      maxNormalizedTokensPerRevision: 500_000,
      maxChunksPerRevision: 2_000,
      maxConcurrentSourceJobsPerApiKey: 1,
      maxReindexPerSourcePerWindow: 3,
      reindexWindowSeconds: 86_400,
      maxFinalizeRequestsPerApiKeyPerWindow: 60,
      finalizeWindowSeconds: 3_600,
    });
    redisService.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    sourceRepository.getRequired.mockResolvedValue(createSource());
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'READY_TO_FINALIZE',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    storageService.downloadText.mockResolvedValue('# Title\n\nBody');
    chunkingService.chunkText.mockReturnValue([
      {
        headingPath: ['Title'],
        content: 'Title\n\nBody',
        tokenCount: 10,
        keywords: ['title', 'body'],
      },
    ]);
    embeddingService.generateBatchEmbeddings.mockResolvedValue([
      { embedding: [0.1, 0.2], model: 'mock', dimensions: 2 },
    ]);

    await expect(
      service.finalize('api-key-1', 'revision-1'),
    ).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        code: 'CONCURRENT_PROCESSING_LIMIT_EXCEEDED',
        details: expect.objectContaining({
          guardrail: 'max_concurrent_source_jobs_per_api_key',
          limit: 1,
          current: 2,
          retryAfter: 60,
        }),
      }),
    });
  });

  it('finalize rejects indexed revisions so reindex stays the only public retry entry', async () => {
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'INDEXED',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });

    await expect(
      service.finalize('api-key-1', 'revision-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sourceRepository.getRequired).not.toHaveBeenCalled();
    expect(revisionRepository.tryMarkProcessing).not.toHaveBeenCalled();
  });

  it('reindex 超过窗口上限时返回 429 结构化错误', async () => {
    memoxPlatformService.getSourceIngestGuardrails.mockReturnValue({
      maxSourceBytes: 10 * 1024 * 1024,
      maxNormalizedTokensPerRevision: 500_000,
      maxChunksPerRevision: 2_000,
      maxConcurrentSourceJobsPerApiKey: 5,
      maxReindexPerSourcePerWindow: 1,
      reindexWindowSeconds: 86_400,
      maxFinalizeRequestsPerApiKeyPerWindow: 60,
      finalizeWindowSeconds: 3_600,
    });
    redisService.incr.mockResolvedValueOnce(2);
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'INDEXED',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    sourceRepository.getRequired.mockResolvedValue(createSource());

    await expect(
      service.reindex('api-key-1', 'revision-1'),
    ).rejects.toMatchObject({
      status: 429,
      response: expect.objectContaining({
        code: 'REINDEX_RATE_LIMIT_EXCEEDED',
        details: expect.objectContaining({
          guardrail: 'max_reindex_per_source_per_window',
          limit: 1,
          current: 2,
          retryAfter: 86400,
        }),
      }),
    });
  });

  it('reindex 不应额外占用 finalize 窗口配额', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(0);
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      userId: 'user-1',
      agentId: null,
      appId: 'app-1',
      runId: null,
      orgId: null,
      projectId: null,
      status: 'INDEXED',
      normalizedTextR2Key: 'tenant/text/revision-1',
      blobR2Key: null,
    });
    sourceRepository.getRequired.mockResolvedValue(createSource());
    sourceRepository.activateRevision.mockResolvedValue(undefined);
    revisionRepository.tryMarkProcessing.mockResolvedValue(true);
    revisionRepository.markIndexed.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    storageService.downloadText.mockResolvedValue('# Title\n\nBody');
    chunkingService.chunkText.mockReturnValue([
      {
        headingPath: ['Title'],
        content: 'Title\n\nBody',
        tokenCount: 10,
        keywords: ['title', 'body'],
      },
    ]);
    embeddingService.generateBatchEmbeddings.mockResolvedValue([
      { embedding: [0.1, 0.2], model: 'mock', dimensions: 2 },
    ]);

    await service.reindex('api-key-1', 'revision-1');

    expect(redisService.incr.mock.calls).toEqual(
      expect.arrayContaining([
        ['memox:source-reindex:api-key-1:source-1:0'],
        ['memox:source-processing:api-key-1'],
      ]),
    );
    expect(
      redisService.incr.mock.calls.some(([key]) =>
        String(key).startsWith('memox:source-finalize:'),
      ),
    ).toBe(false);
  });

  it('keeps the last good source active when a new revision fails after entering processing', async () => {
    const source = {
      ...createSource(),
      currentRevisionId: 'revision-current',
      latestRevisionId: 'revision-current',
      status: 'ACTIVE',
    };
    sourceRepository.getRequired.mockResolvedValue(source);
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      userId: 'user-1',
      agentId: null,
      appId: 'app-1',
      runId: null,
      orgId: null,
      projectId: null,
      status: 'READY_TO_FINALIZE',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    storageService.downloadText.mockResolvedValue('# Title\n\nBody');
    chunkingService.chunkText.mockReturnValue([
      {
        headingPath: ['Title'],
        content: 'Title\n\nBody',
        tokenCount: 10,
        keywords: ['title', 'body'],
      },
    ]);
    embeddingService.generateBatchEmbeddings.mockRejectedValue(
      new Error('embedding unavailable'),
    );

    await expect(service.finalize('api-key-1', 'revision-1')).rejects.toThrow(
      'embedding unavailable',
    );

    expect(revisionRepository.markFailed).toHaveBeenCalledWith(
      'api-key-1',
      'revision-1',
      'embedding unavailable',
    );
  });

  it('rejects a source revision when another processing lease already owns the source', async () => {
    sourceRepository.getRequired.mockResolvedValue(createSource());
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      userId: 'user-1',
      agentId: null,
      appId: 'app-1',
      runId: null,
      orgId: null,
      projectId: null,
      status: 'READY_TO_FINALIZE',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    redisService.setnx.mockResolvedValue(false);

    await expect(service.finalize('api-key-1', 'revision-1')).rejects.toThrow(
      'Knowledge source is processing',
    );

    expect(revisionRepository.tryMarkProcessing).not.toHaveBeenCalled();
  });

  it('memory projection 入队失败时不应把已 indexed revision/source 标记为失败', async () => {
    sourceRepository.getRequired.mockResolvedValue(createSource());
    sourceRepository.activateRevision.mockResolvedValue(undefined);
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      userId: 'user-1',
      agentId: null,
      appId: 'app-1',
      runId: null,
      orgId: null,
      projectId: null,
      status: 'READY_TO_FINALIZE',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    revisionRepository.tryMarkProcessing.mockResolvedValue(true);
    revisionRepository.markIndexed.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      normalizedTextR2Key: 'tenant/text/revision-1',
    });
    revisionRepository.markFailed.mockResolvedValue(undefined);
    storageService.downloadText.mockResolvedValue('# Title\n\nBody');
    chunkingService.chunkText.mockReturnValue([
      {
        headingPath: ['Title'],
        content: 'Title\n\nBody',
        tokenCount: 10,
        keywords: ['title', 'body'],
      },
    ]);
    embeddingService.generateBatchEmbeddings.mockResolvedValue([
      { embedding: [0.1, 0.2], model: 'mock', dimensions: 2 },
    ]);
    sourceMemoryProjectionQueue.add.mockRejectedValue(
      new Error('memory queue unavailable'),
    );

    const result = await service.finalize('api-key-1', 'revision-1');

    expect(result.chunkCount).toBe(1);
    expect(revisionRepository.markFailed).not.toHaveBeenCalled();
  });

  it('finalize 已过期的 pending upload revision 时返回上传已过期错误', async () => {
    const source = createSource();
    sourceRepository.getRequired.mockResolvedValue(source);
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'PENDING_UPLOAD',
      pendingUploadExpiresAt: new Date(Date.now() - 1000),
      normalizedTextR2Key: null,
      blobR2Key: 'tenant/blob/revision-1',
    });

    await expect(
      service.finalize('api-key-1', 'revision-1'),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'SOURCE_UPLOAD_WINDOW_EXPIRED',
        details: expect.objectContaining({
          expiredAt: expect.any(String),
        }),
      }),
    });
  });

  it('finalize 在 pending upload blob 尚未就绪时不应把 revision 标记为 FAILED', async () => {
    const source = createSource();
    sourceRepository.getRequired.mockResolvedValue(source);
    revisionRepository.getRequired.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'PENDING_UPLOAD',
      pendingUploadExpiresAt: new Date(Date.now() + 60_000),
      normalizedTextR2Key: null,
      blobR2Key: 'tenant/blob/revision-1',
    });
    revisionRepository.markFailed.mockResolvedValue(undefined);
    storageService.downloadText.mockRejectedValue(
      new StorageException('missing', StorageErrorCode.FILE_NOT_FOUND),
    );

    await expect(
      service.finalize('api-key-1', 'revision-1'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Source blob upload is not ready',
      }),
    });

    expect(revisionRepository.tryMarkProcessing).not.toHaveBeenCalled();
    expect(revisionRepository.markFailed).not.toHaveBeenCalled();
  });
});
