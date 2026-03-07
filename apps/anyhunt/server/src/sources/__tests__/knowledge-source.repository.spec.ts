import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma-vector/client';
import { describe, expect, it, vi } from 'vitest';
import { KnowledgeSourceRepository } from '../knowledge-source.repository';

function createVectorPrismaMock() {
  return {
    knowledgeSource: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('KnowledgeSourceRepository', () => {
  it('returns a structured code when source identity creation misses title', async () => {
    const vectorPrisma = createVectorPrismaMock();
    vectorPrisma.knowledgeSource.findFirst.mockResolvedValue(null);
    const repository = new KnowledgeSourceRepository(vectorPrisma as never);

    await expect(
      repository.resolveSourceIdentity(
        'api-key-1',
        'note_markdown',
        'file-1',
        {},
      ),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof BadRequestException)) {
        return false;
      }

      const response = error.getResponse();
      return (
        typeof response === 'object' &&
        response !== null &&
        'code' in response &&
        response.code === 'SOURCE_IDENTITY_TITLE_REQUIRED'
      );
    });
  });

  it('rejects resolving a deleted source identity before cleanup completes', async () => {
    const vectorPrisma = createVectorPrismaMock();
    vectorPrisma.knowledgeSource.findFirst.mockResolvedValue({
      id: 'source-1',
      apiKeyId: 'api-key-1',
      sourceType: 'note_markdown',
      externalId: 'file-1',
      userId: 'user-1',
      agentId: null,
      appId: null,
      runId: null,
      orgId: null,
      projectId: 'vault-1',
      title: 'Old Doc',
      displayPath: '/Old.md',
      mimeType: 'text/markdown',
      metadata: null,
      currentRevisionId: 'revision-1',
      status: 'DELETED',
      createdAt: new Date('2026-03-07T00:00:00.000Z'),
      updatedAt: new Date('2026-03-07T00:00:00.000Z'),
    });
    const repository = new KnowledgeSourceRepository(vectorPrisma as never);

    await expect(
      repository.resolveSourceIdentity('api-key-1', 'note_markdown', 'file-1', {
        title: 'Doc',
        displayPath: '/Doc.md',
        userId: 'user-1',
        projectId: 'vault-1',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof ConflictException)) {
        return false;
      }

      const response = error.getResponse();
      return (
        typeof response === 'object' &&
        response !== null &&
        'code' in response &&
        response.code === 'SOURCE_IDENTITY_DELETED'
      );
    });
  });

  it('merges object metadata updates instead of erasing stored lifecycle metadata', async () => {
    const vectorPrisma = createVectorPrismaMock();
    vectorPrisma.knowledgeSource.findFirst.mockResolvedValue({
      id: 'source-1',
      apiKeyId: 'api-key-1',
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
      metadata: {
        source_origin: 'moryflow_sync',
        content_hash: 'hash-1',
        storage_revision: 'rev-1',
      },
      currentRevisionId: 'revision-1',
      status: 'ACTIVE',
      createdAt: new Date('2026-03-07T00:00:00.000Z'),
      updatedAt: new Date('2026-03-07T00:00:00.000Z'),
    });
    vectorPrisma.knowledgeSource.update.mockResolvedValue({
      id: 'source-1',
      metadata: {
        source_origin: 'moryflow_sync',
        content_hash: 'hash-1',
        storage_revision: 'rev-1',
      },
    });
    const repository = new KnowledgeSourceRepository(vectorPrisma as never);

    await repository.resolveSourceIdentity(
      'api-key-1',
      'note_markdown',
      'file-1',
      {
        title: 'Doc',
        userId: 'user-1',
        projectId: 'vault-1',
        metadata: {
          source_origin: 'moryflow_sync',
        },
      },
    );

    expect(vectorPrisma.knowledgeSource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: {
            source_origin: 'moryflow_sync',
            content_hash: 'hash-1',
            storage_revision: 'rev-1',
          },
        }),
      }),
    );
  });

  it('converges to the concurrently created source instead of surfacing conflict', async () => {
    const vectorPrisma = createVectorPrismaMock();
    const existing = {
      id: 'source-1',
      apiKeyId: 'api-key-1',
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
      metadata: null,
      currentRevisionId: null,
      status: 'ACTIVE',
      createdAt: new Date('2026-03-07T00:00:00.000Z'),
      updatedAt: new Date('2026-03-07T00:00:00.000Z'),
    };
    vectorPrisma.knowledgeSource.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    vectorPrisma.knowledgeSource.update.mockResolvedValue(existing);
    const repository = new KnowledgeSourceRepository(vectorPrisma as never);

    const result = await repository.resolveSourceIdentity(
      'api-key-1',
      'note_markdown',
      'file-1',
      {
        title: 'Doc',
        userId: 'user-1',
        projectId: 'vault-1',
      },
    );

    expect(result).toEqual(existing);
  });

  it('rejects scope mutation on an existing source identity', async () => {
    const vectorPrisma = createVectorPrismaMock();
    vectorPrisma.knowledgeSource.findFirst.mockResolvedValue({
      id: 'source-1',
      apiKeyId: 'api-key-1',
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
      metadata: null,
      currentRevisionId: null,
      status: 'ACTIVE',
      createdAt: new Date('2026-03-07T00:00:00.000Z'),
      updatedAt: new Date('2026-03-07T00:00:00.000Z'),
    });
    const repository = new KnowledgeSourceRepository(vectorPrisma as never);

    await expect(
      repository.resolveSourceIdentity('api-key-1', 'note_markdown', 'file-1', {
        projectId: 'vault-2',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof ConflictException)) {
        return false;
      }

      const response = error.getResponse();
      return (
        typeof response === 'object' &&
        response !== null &&
        'code' in response &&
        response.code === 'SOURCE_IDENTITY_SCOPE_MISMATCH'
      );
    });
  });

  it('requires callers to re-prove stored scope on existing source identities', async () => {
    const vectorPrisma = createVectorPrismaMock();
    vectorPrisma.knowledgeSource.findFirst.mockResolvedValue({
      id: 'source-1',
      apiKeyId: 'api-key-1',
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
      metadata: null,
      currentRevisionId: null,
      status: 'ACTIVE',
      createdAt: new Date('2026-03-07T00:00:00.000Z'),
      updatedAt: new Date('2026-03-07T00:00:00.000Z'),
    });
    const repository = new KnowledgeSourceRepository(vectorPrisma as never);

    await expect(
      repository.resolveSourceIdentity('api-key-1', 'note_markdown', 'file-1', {
        title: 'Doc v2',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof ConflictException)) {
        return false;
      }

      const response = error.getResponse();
      return (
        typeof response === 'object' &&
        response !== null &&
        'code' in response &&
        response.code === 'SOURCE_IDENTITY_SCOPE_MISMATCH'
      );
    });
  });

  it('surfaces a stable conflict when createSource loses a concurrent unique-key race', async () => {
    const vectorPrisma = createVectorPrismaMock();
    vectorPrisma.knowledgeSource.findFirst.mockResolvedValue(null);
    vectorPrisma.knowledgeSource.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate source', {
        code: 'P2002',
        clientVersion: '7.0.0',
      }),
    );
    const repository = new KnowledgeSourceRepository(vectorPrisma as never);

    await expect(
      repository.createSource('api-key-1', {
        sourceType: 'note_markdown',
        externalId: 'file-1',
        title: 'Doc',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof ConflictException)) {
        return false;
      }

      const response = error.getResponse();
      return (
        typeof response === 'object' &&
        response !== null &&
        'code' in response &&
        response.code === 'KNOWLEDGE_SOURCE_ALREADY_EXISTS'
      );
    });
  });

  it('surfaces the same structured conflict when createSource sees an existing source in preflight', async () => {
    const vectorPrisma = createVectorPrismaMock();
    vectorPrisma.knowledgeSource.findFirst.mockResolvedValue({
      id: 'source-1',
      apiKeyId: 'api-key-1',
      sourceType: 'note_markdown',
      externalId: 'file-1',
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
      createdAt: new Date('2026-03-08T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z'),
    });
    const repository = new KnowledgeSourceRepository(vectorPrisma as never);

    await expect(
      repository.createSource('api-key-1', {
        sourceType: 'note_markdown',
        externalId: 'file-1',
        title: 'Doc',
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof ConflictException)) {
        return false;
      }

      const response = error.getResponse();
      return (
        typeof response === 'object' &&
        response !== null &&
        'code' in response &&
        response.code === 'KNOWLEDGE_SOURCE_ALREADY_EXISTS'
      );
    });
  });
});
