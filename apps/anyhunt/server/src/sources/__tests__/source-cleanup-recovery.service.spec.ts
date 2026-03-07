import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SourceCleanupRecoveryService } from '../source-cleanup-recovery.service';
import type { KnowledgeSourceRepository } from '../knowledge-source.repository';
import type { KnowledgeSourceDeletionService } from '../knowledge-source-deletion.service';

describe('SourceCleanupRecoveryService', () => {
  const sourceRepository = {
    findDeletedSources: vi.fn(),
  };
  const deletionService = {
    enqueueCleanupJob: vi.fn(),
  };

  let service: SourceCleanupRecoveryService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new SourceCleanupRecoveryService(
      sourceRepository as unknown as KnowledgeSourceRepository,
      deletionService as unknown as KnowledgeSourceDeletionService,
    );
  });

  it('re-enqueues deleted sources for cleanup recovery', async () => {
    sourceRepository.findDeletedSources.mockResolvedValue([
      { id: 'source-1', apiKeyId: 'api-key-1' },
      { id: 'source-2', apiKeyId: 'api-key-2' },
    ]);
    deletionService.enqueueCleanupJob.mockResolvedValue(undefined);

    await service.recoverDeletedSources();

    expect(sourceRepository.findDeletedSources).toHaveBeenCalledWith(100);
    expect(deletionService.enqueueCleanupJob).toHaveBeenNthCalledWith(
      1,
      'api-key-1',
      'source-1',
    );
    expect(deletionService.enqueueCleanupJob).toHaveBeenNthCalledWith(
      2,
      'api-key-2',
      'source-2',
    );
  });
});
