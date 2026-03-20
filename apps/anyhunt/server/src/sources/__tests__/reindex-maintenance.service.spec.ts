import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReindexMaintenanceService } from '../reindex-maintenance.service';

describe('ReindexMaintenanceService', () => {
  const sourceRepository = {
    countActive: vi.fn(),
    findActiveForReindex: vi.fn(),
  };
  const revisionService = {
    reindex: vi.fn(),
  };
  const queue = {
    add: vi.fn(),
    getJobs: vi.fn(),
    getJob: vi.fn(),
  };

  const createService = () =>
    new ReindexMaintenanceService(
      sourceRepository as never,
      revisionService as never,
      queue as never,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    sourceRepository.countActive.mockResolvedValue(1);
    sourceRepository.findActiveForReindex.mockResolvedValue([
      { id: 'source-1', currentRevisionId: 'revision-1' },
    ]);
    queue.add.mockResolvedValue(undefined);
    queue.getJobs.mockResolvedValue([]);
    queue.getJob.mockResolvedValue(null);
  });

  it('将 typed processing conflict 计为 skipped，而不是 failed', async () => {
    const service = createService();
    revisionService.reindex.mockRejectedValue(
      new BadRequestException({
        message: 'Knowledge source is processing',
        code: 'SOURCE_PROCESSING_CONFLICT',
      }),
    );

    const result = await service.processBatch({
      jobId: 'job-1',
      apiKeyId: 'api-key-1',
      cursor: null,
      pageSize: 50,
      maxConcurrent: 3,
      processedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      totalSourceCount: null,
      lastError: null,
      startedAt: new Date().toISOString(),
    });

    expect(result.processedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
  });

  it('将非冲突错误计为 failed', async () => {
    const service = createService();
    revisionService.reindex.mockRejectedValue(
      new Error('embedding unavailable'),
    );

    const result = await service.processBatch({
      jobId: 'job-1',
      apiKeyId: 'api-key-1',
      cursor: null,
      pageSize: 50,
      maxConcurrent: 3,
      processedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      totalSourceCount: null,
      lastError: null,
      startedAt: new Date().toISOString(),
    });

    expect(result.processedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
  });
});
