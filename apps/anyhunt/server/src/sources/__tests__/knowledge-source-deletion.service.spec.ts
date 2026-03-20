import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Queue } from 'bullmq';
import { KnowledgeSourceDeletionService } from '../knowledge-source-deletion.service';
import type { KnowledgeSourceRepository } from '../knowledge-source.repository';
import type { KnowledgeSourceRevisionRepository } from '../knowledge-source-revision.repository';
import type { SourceStorageService } from '../source-storage.service';
import type { VectorPrismaService } from '../../vector-prisma';

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
    currentRevisionId: 'revision-2',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('KnowledgeSourceDeletionService', () => {
  const vectorPrisma = {
    memoryFact: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const sourceRepository = {
    findById: vi.fn(),
    getRequired: vi.fn(),
    markDeleted: vi.fn(),
    deleteById: vi.fn(),
  };
  const revisionRepository = {
    findManyBySourceId: vi.fn(),
  };
  const storageService = {
    deleteObjects: vi.fn(),
  };
  const cleanupQueue = {
    add: vi.fn(),
  };
  const graphProjectionQueue = {
    add: vi.fn(),
  };

  let service: KnowledgeSourceDeletionService;

  beforeEach(() => {
    vi.resetAllMocks();
    vectorPrisma.memoryFact.findMany.mockResolvedValue([]);
    vectorPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        memoryFactFeedback: { deleteMany: vi.fn() },
        memoryFact: { deleteMany: vi.fn() },
      }),
    );
    sourceRepository.findById.mockResolvedValue({
      ...createSource(),
      status: 'DELETED',
    });
    service = new KnowledgeSourceDeletionService(
      vectorPrisma as unknown as VectorPrismaService,
      sourceRepository as unknown as KnowledgeSourceRepository,
      revisionRepository as unknown as KnowledgeSourceRevisionRepository,
      storageService as unknown as SourceStorageService,
      cleanupQueue as unknown as Queue,
      graphProjectionQueue as unknown as Queue,
    );
  });

  it('请求删除时标记 source 为 DELETED 并投递 cleanup job', async () => {
    sourceRepository.getRequired.mockResolvedValue(createSource());
    sourceRepository.markDeleted.mockImplementation(async () => ({
      ...createSource(),
      status: 'DELETED',
    }));
    cleanupQueue.add.mockResolvedValue({ id: 'cleanup-1' });

    const result = await service.requestDelete('api-key-1', 'source-1');

    expect(sourceRepository.markDeleted).toHaveBeenCalledWith(
      'api-key-1',
      'source-1',
    );
    expect(cleanupQueue.add).toHaveBeenCalledWith(
      'cleanup',
      {
        apiKeyId: 'api-key-1',
        sourceId: 'source-1',
      },
      expect.objectContaining({
        jobId: 'memox-source-cleanup-api-key-1-source-1',
      }),
    );
    expect(result.status).toBe('DELETED');
  });

  it('cleanup queue 短暂失败时仍保留 DELETED 状态供恢复扫描补投', async () => {
    sourceRepository.getRequired.mockResolvedValue(createSource());
    sourceRepository.markDeleted.mockImplementation(async () => ({
      ...createSource(),
      status: 'DELETED',
    }));
    cleanupQueue.add.mockRejectedValue(new Error('redis unavailable'));

    const result = await service.requestDelete('api-key-1', 'source-1');

    expect(sourceRepository.markDeleted).toHaveBeenCalledWith(
      'api-key-1',
      'source-1',
    );
    expect(cleanupQueue.add).toHaveBeenCalledOnce();
    expect(result.status).toBe('DELETED');
  });

  it('cleanup source 时会为 derived facts 入 cleanup_memory_fact', async () => {
    revisionRepository.findManyBySourceId.mockResolvedValue([
      {
        id: 'revision-1',
        normalizedTextR2Key: 'tenant-a/vault-text/revision-1',
        blobR2Key: 'tenant-a/vault-blob/revision-1',
      },
      {
        id: 'revision-2',
        normalizedTextR2Key: 'tenant-a/vault-text/revision-2',
        blobR2Key: null,
      },
    ]);
    vectorPrisma.memoryFact.findMany.mockResolvedValue([
      { id: 'memory-1', graphScopeId: 'graph-scope-1' },
    ]);
    storageService.deleteObjects.mockResolvedValue(undefined);
    sourceRepository.deleteById.mockResolvedValue(undefined);

    await service.processCleanupJob('api-key-1', 'source-1');

    expect(storageService.deleteObjects).toHaveBeenCalledWith([
      'tenant-a/vault-text/revision-1',
      'tenant-a/vault-blob/revision-1',
      'tenant-a/vault-text/revision-2',
    ]);
    expect(sourceRepository.deleteById).toHaveBeenCalledWith(
      'api-key-1',
      'source-1',
    );
    expect(graphProjectionQueue.add).toHaveBeenCalledTimes(1);
    expect(graphProjectionQueue.add).toHaveBeenCalledWith(
      'cleanup-memory-fact',
      {
        kind: 'cleanup_memory_fact',
        apiKeyId: 'api-key-1',
        memoryId: 'memory-1',
        graphScopeId: 'graph-scope-1',
      },
      expect.objectContaining({
        jobId: 'memox-graph-cleanup-memory-api-key-1-graph-scope-1-memory-1',
      }),
    );
  });

  it('cleanup deletes source-derived facts and only enqueues memory-based graph cleanup', async () => {
    const tx = {
      memoryFactFeedback: { deleteMany: vi.fn() },
      memoryFact: { deleteMany: vi.fn() },
    };
    vectorPrisma.memoryFact.findMany.mockResolvedValue([
      { id: 'memory-1', graphScopeId: 'graph-scope-1' },
      { id: 'memory-2', graphScopeId: 'graph-scope-2' },
    ]);
    vectorPrisma.$transaction.mockImplementationOnce(async (callback) =>
      callback(tx),
    );
    revisionRepository.findManyBySourceId.mockResolvedValue([]);
    sourceRepository.deleteById.mockResolvedValue(undefined);

    await service.processCleanupJob('api-key-1', 'source-1');

    expect(tx.memoryFactFeedback.deleteMany).toHaveBeenCalledWith({
      where: {
        apiKeyId: 'api-key-1',
        memoryId: { in: ['memory-1', 'memory-2'] },
      },
    });
    expect(tx.memoryFact.deleteMany).toHaveBeenCalledWith({
      where: {
        apiKeyId: 'api-key-1',
        id: { in: ['memory-1', 'memory-2'] },
      },
    });
    expect(graphProjectionQueue.add).toHaveBeenNthCalledWith(
      1,
      'cleanup-memory-fact',
      {
        kind: 'cleanup_memory_fact',
        apiKeyId: 'api-key-1',
        memoryId: 'memory-1',
        graphScopeId: 'graph-scope-1',
      },
      expect.objectContaining({
        jobId: 'memox-graph-cleanup-memory-api-key-1-graph-scope-1-memory-1',
      }),
    );
    expect(graphProjectionQueue.add).toHaveBeenNthCalledWith(
      2,
      'cleanup-memory-fact',
      {
        kind: 'cleanup_memory_fact',
        apiKeyId: 'api-key-1',
        memoryId: 'memory-2',
        graphScopeId: 'graph-scope-2',
      },
      expect.objectContaining({
        jobId: 'memox-graph-cleanup-memory-api-key-1-graph-scope-2-memory-2',
      }),
    );
  });

  it('source 已被重新激活时跳过 cleanup job', async () => {
    sourceRepository.findById.mockResolvedValue({
      ...createSource(),
      status: 'ACTIVE',
    });

    await service.processCleanupJob('api-key-1', 'source-1');

    expect(revisionRepository.findManyBySourceId).not.toHaveBeenCalled();
    expect(storageService.deleteObjects).not.toHaveBeenCalled();
    expect(sourceRepository.deleteById).not.toHaveBeenCalled();
  });

  it('graph cleanup queue 失败时仍继续硬删除 source', async () => {
    revisionRepository.findManyBySourceId.mockResolvedValue([]);
    graphProjectionQueue.add.mockRejectedValue(
      new Error('graph queue unavailable'),
    );
    sourceRepository.deleteById.mockResolvedValue(undefined);

    await service.processCleanupJob('api-key-1', 'source-1');

    expect(graphProjectionQueue.add).not.toHaveBeenCalled();
    expect(sourceRepository.deleteById).toHaveBeenCalledWith(
      'api-key-1',
      'source-1',
    );
  });

  it('derived facts 存在时，cleanup_memory_fact 入队失败仍继续硬删除 source', async () => {
    vectorPrisma.memoryFact.findMany.mockResolvedValue([
      { id: 'memory-1', graphScopeId: 'graph-scope-1' },
    ]);
    revisionRepository.findManyBySourceId.mockResolvedValue([]);
    graphProjectionQueue.add.mockRejectedValue(
      new Error('graph queue unavailable'),
    );
    sourceRepository.deleteById.mockResolvedValue(undefined);

    await service.processCleanupJob('api-key-1', 'source-1');

    expect(graphProjectionQueue.add).toHaveBeenCalledTimes(1);
    expect(graphProjectionQueue.add).toHaveBeenCalledWith(
      'cleanup-memory-fact',
      {
        kind: 'cleanup_memory_fact',
        apiKeyId: 'api-key-1',
        memoryId: 'memory-1',
        graphScopeId: 'graph-scope-1',
      },
      expect.objectContaining({
        jobId: 'memox-graph-cleanup-memory-api-key-1-graph-scope-1-memory-1',
      }),
    );
    expect(sourceRepository.deleteById).toHaveBeenCalledWith(
      'api-key-1',
      'source-1',
    );
  });
});
