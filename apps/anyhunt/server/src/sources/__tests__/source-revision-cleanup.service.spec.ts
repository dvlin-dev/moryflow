import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Queue } from 'bullmq';
import { SourceRevisionCleanupService } from '../source-revision-cleanup.service';
import type { KnowledgeSourceRevisionRepository } from '../knowledge-source-revision.repository';
import type { SourceStorageService } from '../source-storage.service';

describe('SourceRevisionCleanupService', () => {
  const revisionRepository = {
    listExpiredPendingUploads: vi.fn(),
    findAnyById: vi.fn(),
    deleteById: vi.fn(),
  };
  const storageService = {
    deleteObjects: vi.fn(),
  };
  const cleanupQueue = {
    add: vi.fn(),
  };

  let service: SourceRevisionCleanupService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new SourceRevisionCleanupService(
      revisionRepository as unknown as KnowledgeSourceRevisionRepository,
      storageService as unknown as SourceStorageService,
      cleanupQueue as unknown as Queue,
    );
  });

  it('扫描过期 pending upload revision 时应入队 cleanup job', async () => {
    revisionRepository.listExpiredPendingUploads.mockResolvedValue([
      { id: 'revision-1', apiKeyId: 'api-key-1' },
      { id: 'revision-2', apiKeyId: 'api-key-2' },
    ]);

    await service.enqueueExpiredPendingUploads();

    expect(revisionRepository.listExpiredPendingUploads).toHaveBeenCalledWith(
      expect.any(Date),
      100,
    );
    expect(cleanupQueue.add).toHaveBeenNthCalledWith(
      1,
      'cleanup-expired-source-revision',
      { revisionId: 'revision-1', apiKeyId: 'api-key-1' },
      { jobId: 'memox-source-revision-cleanup:revision-1' },
    );
    expect(cleanupQueue.add).toHaveBeenNthCalledWith(
      2,
      'cleanup-expired-source-revision',
      { revisionId: 'revision-2', apiKeyId: 'api-key-2' },
      { jobId: 'memox-source-revision-cleanup:revision-2' },
    );
  });

  it('处理过期 pending upload revision 时应删除 blob 并硬删除 revision', async () => {
    revisionRepository.findAnyById.mockResolvedValue({
      id: 'revision-1',
      apiKeyId: 'api-key-1',
      status: 'PENDING_UPLOAD',
      pendingUploadExpiresAt: new Date(Date.now() - 60_000),
      blobR2Key: 'tenant/blob/revision-1',
      normalizedTextR2Key: null,
    });

    await service.processExpiredPendingUpload('revision-1');

    expect(storageService.deleteObjects).toHaveBeenCalledWith([
      'tenant/blob/revision-1',
    ]);
    expect(revisionRepository.deleteById).toHaveBeenCalledWith(
      'api-key-1',
      'revision-1',
    );
  });
});
