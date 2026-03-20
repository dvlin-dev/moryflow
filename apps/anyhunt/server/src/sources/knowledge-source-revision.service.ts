/**
 * [INPUT]: apiKeyId + source revision payloads
 * [OUTPUT]: revision lifecycle results + indexed chunk stats
 * [POS]: Sources 内容版本编排服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { randomUUID } from 'node:crypto';
import type { Queue } from 'bullmq';
import { EmbeddingService } from '../embedding';
import { MemoxPlatformService } from '../memox-platform';
import { RedisService } from '../redis';
import { StorageErrorCode, StorageException } from '../storage';
import {
  MEMOX_SOURCE_MEMORY_PROJECTION_QUEUE,
  type MemoxSourceMemoryProjectionJobData,
  MEMOX_GRAPH_PROJECTION_QUEUE,
  type MemoxGraphProjectionJobData,
} from '../queue';
import { buildBullJobId } from '../queue/queue.utils';
import { KnowledgeSourceRepository } from './knowledge-source.repository';
import {
  KnowledgeSourceRevisionRepository,
  type KnowledgeSourceRevisionRecord,
} from './knowledge-source-revision.repository';
import { SourceChunkRepository } from './source-chunk.repository';
import { SourceChunkingService } from './source-chunking.service';
import { SourceStorageService } from './source-storage.service';
import {
  computeSourceChecksum,
  estimateTextTokens,
  normalizeSourceText,
} from './source-text.utils';
import {
  createConcurrentProcessingLimitExceeded,
  createFinalizeRateLimitExceeded,
  createReindexRateLimitExceeded,
  createSourceChunkLimitExceeded,
  createSourceSizeLimitExceeded,
  createSourceTokenLimitExceeded,
  createSourceUploadWindowExpired,
} from './sources.errors';
import {
  createSourceProcessingConflictError,
  createSourceRevisionProcessingConflictError,
} from './source-processing.errors';
import type {
  CreateInlineKnowledgeSourceRevisionInput,
  CreateUploadBlobKnowledgeSourceRevisionInput,
  FinalizedKnowledgeSourceRevision,
  SourceUploadSession,
} from './sources.types';

@Injectable()
export class KnowledgeSourceRevisionService {
  private readonly logger = new Logger(KnowledgeSourceRevisionService.name);
  private static readonly PENDING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
  private static readonly CONCURRENT_PROCESSING_RETRY_AFTER_SECONDS = 60;

  constructor(
    private readonly sourceRepository: KnowledgeSourceRepository,
    private readonly revisionRepository: KnowledgeSourceRevisionRepository,
    private readonly chunkRepository: SourceChunkRepository,
    private readonly chunkingService: SourceChunkingService,
    private readonly storageService: SourceStorageService,
    private readonly embeddingService: EmbeddingService,
    private readonly memoxPlatformService: MemoxPlatformService,
    @InjectQueue(MEMOX_SOURCE_MEMORY_PROJECTION_QUEUE)
    private readonly sourceMemoryProjectionQueue: Queue<MemoxSourceMemoryProjectionJobData>,
    @InjectQueue(MEMOX_GRAPH_PROJECTION_QUEUE)
    private readonly graphProjectionQueue: Queue<MemoxGraphProjectionJobData>,
    private readonly redis: RedisService,
  ) {}

  async createInlineTextRevision(
    apiKeyId: string,
    sourceId: string,
    input: CreateInlineKnowledgeSourceRevisionInput,
  ) {
    const source = await this.sourceRepository.getRequired(apiKeyId, sourceId);
    this.assertSourceWritable(source.status);
    const normalizedText = normalizeSourceText(input.content);
    if (!normalizedText) {
      throw new BadRequestException('Source content is required');
    }

    const contentBytes = Buffer.byteLength(normalizedText, 'utf8');
    const contentTokens = estimateTextTokens(normalizedText);
    this.assertGuardrails(contentBytes, contentTokens);

    const revisionId = randomUUID();
    const normalizedTextR2Key = await this.storageService.uploadNormalizedText(
      apiKeyId,
      revisionId,
      normalizedText,
    );

    return this.revisionRepository.createRevision(apiKeyId, {
      id: revisionId,
      sourceId,
      ingestMode: 'INLINE_TEXT',
      checksum: computeSourceChecksum(normalizedText),
      userId: source.userId,
      agentId: source.agentId,
      appId: source.appId,
      runId: source.runId,
      orgId: source.orgId,
      projectId: source.projectId,
      contentBytes,
      contentTokens,
      normalizedTextR2Key,
      mimeType: input.mimeType ?? source.mimeType,
      status: 'READY_TO_FINALIZE',
    });
  }

  async createUploadBlobRevision(
    apiKeyId: string,
    sourceId: string,
    input: CreateUploadBlobKnowledgeSourceRevisionInput,
  ): Promise<{
    revision: KnowledgeSourceRevisionRecord;
    uploadSession: SourceUploadSession;
  }> {
    const source = await this.sourceRepository.getRequired(apiKeyId, sourceId);
    this.assertSourceWritable(source.status);
    const revisionId = randomUUID();
    const session = this.storageService.createUploadSession(
      apiKeyId,
      revisionId,
      {
        contentType: input.mimeType ?? source.mimeType,
        filename: input.filename,
      },
    );

    const revision = await this.revisionRepository.createRevision(apiKeyId, {
      id: revisionId,
      sourceId,
      ingestMode: 'UPLOAD_BLOB',
      userId: source.userId,
      agentId: source.agentId,
      appId: source.appId,
      runId: source.runId,
      orgId: source.orgId,
      projectId: source.projectId,
      blobR2Key: session.blobR2Key,
      pendingUploadExpiresAt: new Date(
        Date.now() + KnowledgeSourceRevisionService.PENDING_UPLOAD_TTL_MS,
      ),
      mimeType: input.mimeType ?? source.mimeType,
      status: 'PENDING_UPLOAD',
    });

    return {
      revision,
      uploadSession: {
        uploadUrl: session.uploadUrl,
        expiresAt: session.expiresAt,
        headers: session.headers,
        revisionId,
      },
    };
  }

  async getById(apiKeyId: string, sourceId: string, revisionId: string) {
    return this.revisionRepository.getRequiredForSource(
      apiKeyId,
      sourceId,
      revisionId,
    );
  }

  async getByRevisionId(apiKeyId: string, revisionId: string) {
    return this.revisionRepository.getRequired(apiKeyId, revisionId);
  }

  async finalize(
    apiKeyId: string,
    revisionId: string,
  ): Promise<FinalizedKnowledgeSourceRevision> {
    const revision = await this.revisionRepository.getRequired(
      apiKeyId,
      revisionId,
    );
    if (
      revision.status !== 'READY_TO_FINALIZE' &&
      revision.status !== 'PENDING_UPLOAD'
    ) {
      throw new BadRequestException(
        'Knowledge source revision is not ready to finalize',
      );
    }
    if (this.isPendingUploadExpired(revision)) {
      throw createSourceUploadWindowExpired(revision.pendingUploadExpiresAt!);
    }

    await this.assertFinalizeWindow(apiKeyId);
    return this.processRevision(apiKeyId, revision, [revision.status]);
  }

  async reindex(
    apiKeyId: string,
    revisionId: string,
  ): Promise<FinalizedKnowledgeSourceRevision> {
    const revision = await this.revisionRepository.getRequired(
      apiKeyId,
      revisionId,
    );
    if (!revision.normalizedTextR2Key && !revision.blobR2Key) {
      throw new BadRequestException(
        'Normalized text or uploaded blob is required before reindex',
      );
    }

    if (revision.status === 'PROCESSING') {
      throw createSourceRevisionProcessingConflictError();
    }

    const source = await this.sourceRepository.getRequired(
      apiKeyId,
      revision.sourceId,
    );
    this.assertSourceWritable(source.status);
    await this.assertReindexWindow(apiKeyId, revision.sourceId);

    return this.processRevision(apiKeyId, revision, [revision.status]);
  }

  private async processRevision(
    apiKeyId: string,
    revision: KnowledgeSourceRevisionRecord,
    allowedStatuses: KnowledgeSourceRevisionRecord['status'][],
  ): Promise<FinalizedKnowledgeSourceRevision> {
    const slotAcquired = await this.acquireProcessingSlot(apiKeyId);
    const sourceLockOwner = revision.id;
    let sourceLockAcquired = false;
    let markedSourceProcessing = false;
    let markedRevisionProcessing = false;
    let shouldFailSource = false;

    try {
      const source = await this.sourceRepository.getRequired(
        apiKeyId,
        revision.sourceId,
      );
      this.assertSourceWritable(source.status);
      await this.acquireSourceProcessingLease(
        apiKeyId,
        source.id,
        sourceLockOwner,
      );
      sourceLockAcquired = true;

      const normalizedText = await this.loadNormalizedSourceText(revision);
      if (!normalizedText) {
        throw new BadRequestException('Source content is required');
      }

      const contentBytes = Buffer.byteLength(normalizedText, 'utf8');
      const contentTokens = estimateTextTokens(normalizedText);
      this.assertGuardrails(contentBytes, contentTokens);

      const chunks = this.chunkingService.chunkText(normalizedText);
      if (chunks.length === 0) {
        throw new BadRequestException('No retrievable chunks generated');
      }

      const guardrails = this.memoxPlatformService.getSourceIngestGuardrails();
      if (chunks.length > guardrails.maxChunksPerRevision) {
        throw createSourceChunkLimitExceeded({
          limit: guardrails.maxChunksPerRevision,
          current: chunks.length,
        });
      }

      markedRevisionProcessing =
        await this.revisionRepository.tryMarkProcessing(
          apiKeyId,
          revision.id,
          allowedStatuses,
        );
      if (!markedRevisionProcessing) {
        throw createSourceRevisionProcessingConflictError();
      }

      shouldFailSource = !source.currentRevisionId;
      if (shouldFailSource) {
        await this.sourceRepository.markProcessing(apiKeyId, source.id);
        markedSourceProcessing = true;
      }

      const embeddings = await this.embeddingService.generateBatchEmbeddings(
        chunks.map((chunk) => chunk.content),
      );

      await this.chunkRepository.replaceRevisionChunks({
        apiKeyId,
        sourceId: source.id,
        revisionId: revision.id,
        userId: revision.userId,
        agentId: revision.agentId,
        appId: revision.appId,
        runId: revision.runId,
        orgId: revision.orgId,
        projectId: revision.projectId,
        chunks: chunks.map((chunk, index) => ({
          ...chunk,
          metadata: {
            sourceType: source.sourceType,
            sourceTitle: source.title,
            displayPath: source.displayPath,
            chunkIndex: index,
          },
          embedding: embeddings[index].embedding,
        })),
      });

      const checksum = computeSourceChecksum(normalizedText);
      const normalizedTextR2Key =
        revision.normalizedTextR2Key ??
        (await this.storageService.uploadNormalizedText(
          apiKeyId,
          revision.id,
          normalizedText,
        ));
      const finalizedRevision = await this.revisionRepository.markIndexed(
        apiKeyId,
        revision.id,
        {
          checksum,
          contentBytes,
          contentTokens,
          normalizedTextR2Key,
        },
      );
      await this.sourceRepository.markActive(apiKeyId, source.id, revision.id);
      await this.enqueueSourceMemoryProjection(
        apiKeyId,
        source.id,
        revision.id,
      );
      await this.enqueueSourceGraphProjection(apiKeyId, source.id, revision.id);

      return {
        revisionId: finalizedRevision.id,
        sourceId: finalizedRevision.sourceId,
        chunkCount: chunks.length,
        contentBytes,
        contentTokens,
        checksum,
        normalizedTextR2Key: finalizedRevision.normalizedTextR2Key ?? '',
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown finalize error';
      this.logger.error(
        `Failed to finalize source revision ${revision.id}: ${message}`,
      );
      if (markedRevisionProcessing) {
        await this.revisionRepository.markFailed(
          apiKeyId,
          revision.id,
          message,
        );
      }
      if (markedSourceProcessing && shouldFailSource) {
        await this.sourceRepository.markFailed(apiKeyId, revision.sourceId);
      }
      throw error;
    } finally {
      if (sourceLockAcquired) {
        await this.releaseSourceProcessingLease(
          apiKeyId,
          revision.sourceId,
          sourceLockOwner,
        );
      }
      if (slotAcquired) {
        await this.releaseProcessingSlot(apiKeyId);
      }
    }
  }

  private buildSourceProcessingLockKey(
    apiKeyId: string,
    sourceId: string,
  ): string {
    return `memox:source-processing-lock:${apiKeyId}:${sourceId}`;
  }

  private async acquireSourceProcessingLease(
    apiKeyId: string,
    sourceId: string,
    owner: string,
  ): Promise<void> {
    const acquired = await this.redis.setnx(
      this.buildSourceProcessingLockKey(apiKeyId, sourceId),
      owner,
      15 * 60,
    );
    if (!acquired) {
      throw createSourceProcessingConflictError();
    }
  }

  private async releaseSourceProcessingLease(
    apiKeyId: string,
    sourceId: string,
    owner: string,
  ): Promise<void> {
    await this.redis.compareAndDelete(
      this.buildSourceProcessingLockKey(apiKeyId, sourceId),
      owner,
    );
  }

  private assertGuardrails(contentBytes: number, contentTokens: number): void {
    const guardrails = this.memoxPlatformService.getSourceIngestGuardrails();
    if (contentBytes > guardrails.maxSourceBytes) {
      throw createSourceSizeLimitExceeded({
        limit: guardrails.maxSourceBytes,
        current: contentBytes,
      });
    }
    if (contentTokens > guardrails.maxNormalizedTokensPerRevision) {
      throw createSourceTokenLimitExceeded({
        limit: guardrails.maxNormalizedTokensPerRevision,
        current: contentTokens,
      });
    }
  }

  private assertSourceWritable(status: string): void {
    if (status === 'DELETED') {
      throw new BadRequestException('Knowledge source is deleted');
    }
  }

  private async assertFinalizeWindow(apiKeyId: string): Promise<void> {
    const guardrails = this.memoxPlatformService.getSourceIngestGuardrails();
    const windowSeconds = guardrails.finalizeWindowSeconds;
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `memox:source-finalize:${apiKeyId}:${bucket}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    if (current > guardrails.maxFinalizeRequestsPerApiKeyPerWindow) {
      throw createFinalizeRateLimitExceeded({
        limit: guardrails.maxFinalizeRequestsPerApiKeyPerWindow,
        current,
        retryAfter: windowSeconds,
      });
    }
  }

  private async assertReindexWindow(
    apiKeyId: string,
    sourceId: string,
  ): Promise<void> {
    const guardrails = this.memoxPlatformService.getSourceIngestGuardrails();
    const windowSeconds = guardrails.reindexWindowSeconds;
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `memox:source-reindex:${apiKeyId}:${sourceId}:${bucket}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    if (current > guardrails.maxReindexPerSourcePerWindow) {
      throw createReindexRateLimitExceeded({
        limit: guardrails.maxReindexPerSourcePerWindow,
        current,
        retryAfter: windowSeconds,
      });
    }
  }

  private async acquireProcessingSlot(apiKeyId: string): Promise<boolean> {
    const guardrails = this.memoxPlatformService.getSourceIngestGuardrails();
    const key = `memox:source-processing:${apiKeyId}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, 15 * 60);
    }
    if (current > guardrails.maxConcurrentSourceJobsPerApiKey) {
      await this.redis.decr(key);
      throw createConcurrentProcessingLimitExceeded({
        limit: guardrails.maxConcurrentSourceJobsPerApiKey,
        current,
        retryAfter:
          KnowledgeSourceRevisionService.CONCURRENT_PROCESSING_RETRY_AFTER_SECONDS,
      });
    }
    return true;
  }

  private isPendingUploadExpired(
    revision: Pick<
      KnowledgeSourceRevisionRecord,
      'status' | 'pendingUploadExpiresAt'
    >,
  ): boolean {
    return (
      revision.status === 'PENDING_UPLOAD' &&
      revision.pendingUploadExpiresAt instanceof Date &&
      revision.pendingUploadExpiresAt.getTime() <= Date.now()
    );
  }

  private async releaseProcessingSlot(apiKeyId: string): Promise<void> {
    const key = `memox:source-processing:${apiKeyId}`;
    const current = await this.redis.decr(key);
    if (current <= 0) {
      await this.redis.del(key);
    }
  }

  private async loadNormalizedSourceText(
    revision: KnowledgeSourceRevisionRecord,
  ): Promise<string> {
    if (revision.normalizedTextR2Key) {
      return normalizeSourceText(
        await this.storageService.downloadText(revision.normalizedTextR2Key),
      );
    }

    if (!revision.blobR2Key) {
      throw new BadRequestException(
        'Normalized text or uploaded blob is required before finalize',
      );
    }

    try {
      return normalizeSourceText(
        await this.storageService.downloadText(revision.blobR2Key),
      );
    } catch (error) {
      if (
        error instanceof StorageException &&
        error.code === StorageErrorCode.FILE_NOT_FOUND
      ) {
        throw new BadRequestException('Source blob upload is not ready');
      }
      throw error;
    }
  }

  private async enqueueSourceGraphProjection(
    apiKeyId: string,
    sourceId: string,
    revisionId: string,
  ): Promise<void> {
    if (!this.memoxPlatformService.isSourceGraphProjectionEnabled()) {
      return;
    }
    try {
      await this.graphProjectionQueue.add(
        'project-source-revision',
        {
          kind: 'project_source_revision',
          apiKeyId,
          sourceId,
          revisionId,
        },
        {
          jobId: buildBullJobId(
            'memox',
            'graph',
            'source',
            apiKeyId,
            sourceId,
            revisionId,
          ),
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown graph enqueue error';
      this.logger.warn(
        `Source revision ${revisionId} indexed but graph projection enqueue failed: ${message}`,
      );
    }
  }

  private async enqueueSourceMemoryProjection(
    apiKeyId: string,
    sourceId: string,
    revisionId: string,
  ): Promise<void> {
    try {
      await this.sourceMemoryProjectionQueue.add(
        'project-source-memory-facts',
        {
          apiKeyId,
          sourceId,
          revisionId,
        },
        {
          jobId: buildBullJobId(
            'memox',
            'source-memory',
            apiKeyId,
            sourceId,
            revisionId,
          ),
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown memory enqueue error';
      this.logger.warn(
        `Source revision ${revisionId} indexed but memory projection enqueue failed: ${message}`,
      );
    }
  }
}
