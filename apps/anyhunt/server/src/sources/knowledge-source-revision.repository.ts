/**
 * [INPUT]: apiKeyId + revision lifecycle payloads
 * [OUTPUT]: KnowledgeSourceRevision records
 * [POS]: Sources 内容版本仓储
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type KnowledgeSourceRevision as PrismaKnowledgeSourceRevision,
  type SourceRevisionIngestMode,
} from '../../generated/prisma-vector/client';
import { VectorPrismaService } from '../vector-prisma';
import { BaseRepository } from '../common/base.repository';
import type { SourceScope } from './sources.types';

export type KnowledgeSourceRevisionRecord = PrismaKnowledgeSourceRevision;

interface CreateRevisionInput extends SourceScope {
  id: string;
  sourceId: string;
  ingestMode: SourceRevisionIngestMode;
  checksum?: string | null;
  contentBytes?: number | null;
  contentTokens?: number | null;
  normalizedTextR2Key?: string | null;
  blobR2Key?: string | null;
  pendingUploadExpiresAt?: Date | null;
  mimeType?: string | null;
  status: PrismaKnowledgeSourceRevision['status'];
  error?: string | null;
}

@Injectable()
export class KnowledgeSourceRevisionRepository extends BaseRepository<KnowledgeSourceRevisionRecord> {
  constructor(private readonly vectorPrisma: VectorPrismaService) {
    super(vectorPrisma, vectorPrisma.knowledgeSourceRevision);
  }

  async createRevision(
    apiKeyId: string,
    input: CreateRevisionInput,
  ): Promise<KnowledgeSourceRevisionRecord> {
    return this.vectorPrisma.knowledgeSourceRevision.create({
      data: {
        id: input.id,
        apiKeyId,
        sourceId: input.sourceId,
        ingestMode: input.ingestMode,
        checksum: input.checksum ?? null,
        userId: input.userId ?? null,
        agentId: input.agentId ?? null,
        appId: input.appId ?? null,
        runId: input.runId ?? null,
        orgId: input.orgId ?? null,
        projectId: input.projectId ?? null,
        contentBytes: input.contentBytes ?? null,
        contentTokens: input.contentTokens ?? null,
        normalizedTextR2Key: input.normalizedTextR2Key ?? null,
        blobR2Key: input.blobR2Key ?? null,
        pendingUploadExpiresAt: input.pendingUploadExpiresAt ?? null,
        mimeType: input.mimeType ?? null,
        status: input.status,
        error: input.error ?? null,
      },
    });
  }

  async getRequired(
    apiKeyId: string,
    revisionId: string,
  ): Promise<KnowledgeSourceRevisionRecord> {
    const revision = await this.findById(apiKeyId, revisionId);
    if (!revision) {
      throw new NotFoundException('Knowledge source revision not found');
    }
    return revision;
  }

  async getRequiredForSource(
    apiKeyId: string,
    sourceId: string,
    revisionId: string,
  ): Promise<KnowledgeSourceRevisionRecord> {
    const revision = await this.findOne(apiKeyId, { id: revisionId, sourceId });
    if (!revision) {
      throw new NotFoundException('Knowledge source revision not found');
    }
    return revision;
  }

  async findManyBySourceId(
    apiKeyId: string,
    sourceId: string,
  ): Promise<KnowledgeSourceRevisionRecord[]> {
    return this.findMany(apiKeyId, {
      where: { sourceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async tryMarkProcessing(
    apiKeyId: string,
    revisionId: string,
    allowedStatuses: KnowledgeSourceRevisionRecord['status'][],
  ): Promise<boolean> {
    const result = await this.vectorPrisma.knowledgeSourceRevision.updateMany({
      where: {
        id: revisionId,
        apiKeyId,
        status: {
          in: allowedStatuses,
        },
      },
      data: {
        status: 'PROCESSING',
        error: null,
      },
    });

    return result.count === 1;
  }

  async markProcessing(
    apiKeyId: string,
    revisionId: string,
  ): Promise<KnowledgeSourceRevisionRecord> {
    return this.updateById(apiKeyId, revisionId, {
      status: 'PROCESSING',
      error: null,
    });
  }

  async markIndexed(
    apiKeyId: string,
    revisionId: string,
    params: {
      checksum: string;
      contentBytes: number;
      contentTokens: number;
      normalizedTextR2Key: string;
    },
  ): Promise<KnowledgeSourceRevisionRecord> {
    return this.vectorPrisma.knowledgeSourceRevision.update({
      where: { id: revisionId },
      data: {
        checksum: params.checksum,
        contentBytes: params.contentBytes,
        contentTokens: params.contentTokens,
        normalizedTextR2Key: params.normalizedTextR2Key,
        pendingUploadExpiresAt: null,
        status: 'INDEXED',
        error: null,
        indexedAt: new Date(),
      },
    });
  }

  async markFailed(
    apiKeyId: string,
    revisionId: string,
    error: string,
  ): Promise<KnowledgeSourceRevisionRecord> {
    return this.updateById(apiKeyId, revisionId, {
      status: 'FAILED',
      error,
    });
  }

  async listExpiredPendingUploads(
    before: Date,
    take = 100,
  ): Promise<Array<{ id: string; apiKeyId: string }>> {
    return this.vectorPrisma.knowledgeSourceRevision.findMany({
      where: {
        status: 'PENDING_UPLOAD',
        pendingUploadExpiresAt: {
          lte: before,
        },
      },
      select: {
        id: true,
        apiKeyId: true,
      },
      orderBy: {
        pendingUploadExpiresAt: 'asc',
      },
      take,
    });
  }

  async findAnyById(
    revisionId: string,
  ): Promise<KnowledgeSourceRevisionRecord | null> {
    return this.vectorPrisma.knowledgeSourceRevision.findUnique({
      where: { id: revisionId },
    });
  }
}
