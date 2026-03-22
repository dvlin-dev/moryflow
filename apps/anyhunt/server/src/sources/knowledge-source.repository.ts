/**
 * [INPUT]: apiKeyId + KnowledgeSource CRUD payloads
 * [OUTPUT]: KnowledgeSource records
 * [POS]: Sources 身份资源仓储
 */

import {
  BadRequestException,
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
import type {
  CreateKnowledgeSourceInput,
  LookupSourceIdentityInput,
  SourceScope,
  ResolveSourceIdentityInput,
} from './sources.types';

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
        throw this.createAlreadyExistsConflict();
      }
    }

    try {
      return await this.vectorPrisma.knowledgeSource.create({
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
    } catch (error) {
      if (
        input.externalId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw this.createAlreadyExistsConflict();
      }
      throw error;
    }
  }

  async resolveSourceIdentity(
    apiKeyId: string,
    sourceType: string,
    externalId: string,
    input: ResolveSourceIdentityInput,
  ): Promise<KnowledgeSourceRecord> {
    const existing = await this.findExistingSourceIdentity(
      apiKeyId,
      sourceType,
      externalId,
      input,
    );
    if (existing) {
      return this.refreshSourceIdentity(apiKeyId, existing, input);
    }

    if (!input.title?.trim()) {
      throw new BadRequestException({
        message: 'title is required when creating source identity',
        code: 'SOURCE_IDENTITY_TITLE_REQUIRED',
      });
    }

    try {
      return await this.createSource(apiKeyId, {
        sourceType,
        externalId,
        userId: input.userId,
        agentId: input.agentId,
        appId: input.appId,
        runId: input.runId,
        orgId: input.orgId,
        projectId: input.projectId,
        title: input.title,
        displayPath: input.displayPath,
        mimeType: input.mimeType,
        metadata: input.metadata,
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002')
      ) {
        const createdConcurrently = await this.findExistingSourceIdentity(
          apiKeyId,
          sourceType,
          externalId,
          input,
        );
        if (createdConcurrently) {
          return this.refreshSourceIdentity(
            apiKeyId,
            createdConcurrently,
            input,
          );
        }
      }
      throw error;
    }
  }

  async getSourceIdentity(
    apiKeyId: string,
    sourceType: string,
    externalId: string,
    input: LookupSourceIdentityInput,
  ): Promise<KnowledgeSourceRecord> {
    const existing = await this.findExistingSourceIdentity(
      apiKeyId,
      sourceType,
      externalId,
      input,
    );
    if (existing) {
      return existing;
    }

    throw new NotFoundException({
      message: 'source identity not found',
      code: 'SOURCE_IDENTITY_NOT_FOUND',
    });
  }

  private async findExistingSourceIdentity(
    apiKeyId: string,
    sourceType: string,
    externalId: string,
    input: SourceScope,
  ): Promise<KnowledgeSourceRecord | null> {
    const existing = await this.findByExternalId(
      apiKeyId,
      sourceType,
      externalId,
    );
    if (!existing) {
      return null;
    }

    this.assertNotDeleted(existing);
    this.assertScopeInvariant(existing, input);
    return existing;
  }

  private refreshSourceIdentity(
    apiKeyId: string,
    existing: KnowledgeSourceRecord,
    input: ResolveSourceIdentityInput,
  ): Promise<KnowledgeSourceRecord> {
    const updateData = this.buildIdentityUpdateData(existing, input);
    if (Object.keys(updateData).length === 0) {
      return Promise.resolve(existing);
    }

    return this.updateById(apiKeyId, existing.id, updateData);
  }

  private assertNotDeleted(source: KnowledgeSourceRecord): void {
    if (source.status !== 'DELETED') {
      return;
    }

    throw new ConflictException({
      message: 'source identity is deleted and pending cleanup',
      code: 'SOURCE_IDENTITY_DELETED',
    });
  }

  private assertScopeInvariant(
    existing: KnowledgeSourceRecord,
    input: SourceScope,
  ): void {
    const mismatchedFields = [
      this.getScopeMismatch('user_id', existing.userId, input.userId),
      this.getScopeMismatch('agent_id', existing.agentId, input.agentId),
      this.getScopeMismatch('app_id', existing.appId, input.appId),
      this.getScopeMismatch('run_id', existing.runId, input.runId),
      this.getScopeMismatch('org_id', existing.orgId, input.orgId),
      this.getScopeMismatch('project_id', existing.projectId, input.projectId),
    ].filter((field): field is string => field !== null);

    if (mismatchedFields.length === 0) {
      return;
    }

    throw new ConflictException({
      message: 'source identity scope mismatch',
      code: 'SOURCE_IDENTITY_SCOPE_MISMATCH',
      fields: mismatchedFields,
    });
  }

  private getScopeMismatch(
    field: string,
    existingValue: string | null,
    nextValue: string | null | undefined,
  ): string | null {
    if (nextValue === undefined) {
      return existingValue === null ? null : field;
    }

    return existingValue === nextValue ? null : field;
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

  async findDeletedSources(limit: number): Promise<
    Array<{
      id: string;
      apiKeyId: string;
    }>
  > {
    return this.vectorPrisma.knowledgeSource.findMany({
      where: {
        status: 'DELETED',
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
      select: {
        id: true,
        apiKeyId: true,
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

  async recordLatestRevision(
    apiKeyId: string,
    sourceId: string,
    latestRevisionId: string,
  ): Promise<KnowledgeSourceRecord> {
    return this.updateById(apiKeyId, sourceId, {
      latestRevisionId,
    });
  }

  async activateRevision(
    apiKeyId: string,
    sourceId: string,
    revisionId: string,
  ): Promise<KnowledgeSourceRecord> {
    return this.updateById(apiKeyId, sourceId, {
      status: 'ACTIVE',
      currentRevisionId: revisionId,
      latestRevisionId: revisionId,
    });
  }

  async markDeleted(
    apiKeyId: string,
    sourceId: string,
  ): Promise<KnowledgeSourceRecord> {
    return this.updateById(apiKeyId, sourceId, {
      status: 'DELETED',
      currentRevisionId: null,
    });
  }

  private createAlreadyExistsConflict(): ConflictException {
    return new ConflictException({
      message: 'knowledge source already exists',
      code: 'KNOWLEDGE_SOURCE_ALREADY_EXISTS',
    });
  }

  async countActive(apiKeyId: string): Promise<number> {
    return this.vectorPrisma.knowledgeSource.count({
      where: {
        apiKeyId,
        status: 'ACTIVE',
        currentRevisionId: { not: null },
      },
    });
  }

  async findActiveForReindex(
    apiKeyId: string,
    cursor: string | null,
    pageSize: number,
  ): Promise<Array<{ id: string; currentRevisionId: string | null }>> {
    return this.vectorPrisma.knowledgeSource.findMany({
      where: {
        apiKeyId,
        status: 'ACTIVE',
        currentRevisionId: { not: null },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: pageSize,
      select: {
        id: true,
        currentRevisionId: true,
      },
    });
  }

  private buildIdentityUpdateData(
    existing: KnowledgeSourceRecord,
    input: ResolveSourceIdentityInput,
  ): Partial<
    Omit<KnowledgeSourceRecord, 'id' | 'apiKeyId' | 'createdAt' | 'updatedAt'>
  > {
    const data: Partial<
      Omit<KnowledgeSourceRecord, 'id' | 'apiKeyId' | 'createdAt' | 'updatedAt'>
    > = {};

    if (input.title !== undefined) {
      data.title = input.title;
    }
    if (input.displayPath !== undefined) {
      data.displayPath = input.displayPath ?? null;
    }
    if (input.mimeType !== undefined) {
      data.mimeType = input.mimeType ?? null;
    }
    if (input.metadata !== undefined) {
      data.metadata = this.resolveUpdatedMetadata(
        existing.metadata,
        input.metadata,
      );
    }

    return data;
  }

  private resolveUpdatedMetadata(
    existingMetadata: KnowledgeSourceRecord['metadata'],
    nextMetadata: ResolveSourceIdentityInput['metadata'],
  ): KnowledgeSourceRecord['metadata'] {
    if (nextMetadata === null) {
      return null;
    }

    if (
      !this.isJsonObject(existingMetadata) ||
      !this.isJsonObject(nextMetadata)
    ) {
      return (nextMetadata ?? null) as KnowledgeSourceRecord['metadata'];
    }

    return {
      ...existingMetadata,
      ...nextMetadata,
    } as KnowledgeSourceRecord['metadata'];
  }

  private isJsonObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
