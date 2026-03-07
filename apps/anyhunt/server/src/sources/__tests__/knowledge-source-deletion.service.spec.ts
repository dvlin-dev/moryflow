import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Queue } from 'bullmq';
import { KnowledgeSourceDeletionService } from '../knowledge-source-deletion.service';
import type { MemoxPlatformService } from '../../memox-platform';
import type { KnowledgeSourceRepository } from '../knowledge-source.repository';
import type { KnowledgeSourceRevisionRepository } from '../knowledge-source-revision.repository';
import type { SourceStorageService } from '../source-storage.service';

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
  const memoxPlatformService = {
    isSourceGraphProjectionEnabled: vi.fn(),
  };

  let service: KnowledgeSourceDeletionService;

  beforeEach(() => {
    vi.resetAllMocks();
    memoxPlatformService.isSourceGraphProjectionEnabled.mockReturnValue(false);
    sourceRepository.findById.mockResolvedValue({
      ...createSource(),
      status: 'DELETED',
    });
    service = new KnowledgeSourceDeletionService(
      sourceRepository as unknown as KnowledgeSourceRepository,
      revisionRepository as unknown as KnowledgeSourceRevisionRepository,
      storageService as unknown as SourceStorageService,
      cleanupQueue as unknown as Queue,
      graphProjectionQueue as unknown as Queue,
      memoxPlatformService as unknown as MemoxPlatformService,
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
        jobId: 'memox-source-cleanup:api-key-1:source-1',
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

  it('graph 默认关闭时 cleanup 只清对象和 source，不入 graph queue', async () => {
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
    expect(graphProjectionQueue.add).not.toHaveBeenCalled();
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
    memoxPlatformService.isSourceGraphProjectionEnabled.mockReturnValue(true);
    revisionRepository.findManyBySourceId.mockResolvedValue([]);
    graphProjectionQueue.add.mockRejectedValue(new Error('graph queue unavailable'));
    sourceRepository.deleteById.mockResolvedValue(undefined);

    await service.processCleanupJob('api-key-1', 'source-1');

    expect(graphProjectionQueue.add).toHaveBeenCalledOnce();
    expect(sourceRepository.deleteById).toHaveBeenCalledWith(
      'api-key-1',
      'source-1',
    );
  });
});
