/**
 * [INPUT]: apiKeyId + KnowledgeSource CRUD payloads
 * [OUTPUT]: KnowledgeSource records
 * [POS]: Sources 身份资源仓储
 */

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type KnowledgeSource as PrismaKnowledgeSource,
} from '../../generated/prisma-vector/client';
import { VectorPrismaService } from '../vector-prisma';
import { BaseRepository } from '../common/base.repository';
import type { CreateKnowledgeSourceInput } from './sources.types';

export type KnowledgeSourceRecord = PrismaKnowledgeSource;

@Injectable()
export class KnowledgeSourceRepository extends BaseRepository<KnowledgeSourceRecord> {
  constructor(private readonly vectorPrisma: VectorPrismaService) {
    super(vectorPrisma, vectorPrisma.knowledgeSource);
  }

  async createSource(
    apiKeyId: string,
    input: CreateKnowledgeSourceInput,
  ): Promise<KnowledgeSourceRecord> {
    if (input.externalId) {
      const existing = await this.findByExternalId(
        apiKeyId,
        input.sourceType,
        input.externalId,
      );
      if (existing) {
        throw new ConflictException('Knowledge source already exists');
      }
    }

    return this.vectorPrisma.knowledgeSource.create({
      data: {
        apiKeyId,
        sourceType: input.sourceType,
        externalId: input.externalId ?? null,
        userId: input.userId ?? null,
        agentId: input.agentId ?? null,
        appId: input.appId ?? null,
        runId: input.runId ?? null,
        orgId: input.orgId ?? null,
        projectId: input.projectId ?? null,
        title: input.title,
        displayPath: input.displayPath ?? null,
        mimeType: input.mimeType ?? null,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });
  }

  async findByExternalId(
    apiKeyId: string,
    sourceType: string,
    externalId: string,
  ): Promise<KnowledgeSourceRecord | null> {
    return this.vectorPrisma.knowledgeSource.findFirst({
      where: {
        apiKeyId,
        sourceType,
        externalId,
      },
    });
  }

  async getRequired(
    apiKeyId: string,
    sourceId: string,
  ): Promise<KnowledgeSourceRecord> {
    const source = await this.findById(apiKeyId, sourceId);
    if (!source) {
      throw new NotFoundException('Knowledge source not found');
    }
    return source;
  }

  async markProcessing(apiKeyId: string, sourceId: string): Promise<void> {
    await this.updateById(apiKeyId, sourceId, { status: 'PROCESSING' });
  }

  async markActive(
    apiKeyId: string,
    sourceId: string,
    currentRevisionId: string,
  ): Promise<KnowledgeSourceRecord> {
    return this.updateById(apiKeyId, sourceId, {
      status: 'ACTIVE',
      currentRevisionId,
    });
  }

  async markFailed(apiKeyId: string, sourceId: string): Promise<void> {
    await this.updateById(apiKeyId, sourceId, { status: 'FAILED' });
  }

  async markDeleted(
    apiKeyId: string,
    sourceId: string,
  ): Promise<KnowledgeSourceRecord> {
    return this.updateById(apiKeyId, sourceId, {
      status: 'DELETED',
    });
  }
}
