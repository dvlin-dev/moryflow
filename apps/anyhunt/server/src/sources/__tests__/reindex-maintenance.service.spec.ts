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

  it('后续批次使用唯一 queue jobId，避免被当前 active job 去重吞掉', async () => {
    const service = createService();
    sourceRepository.countActive.mockResolvedValue(100);
    sourceRepository.findActiveForReindex.mockResolvedValue([
      { id: 'source-1', currentRevisionId: 'revision-1' },
      { id: 'source-2', currentRevisionId: 'revision-2' },
    ]);
    revisionService.reindex.mockResolvedValue(undefined);

    const result = await service.processBatch({
      jobId: 'chain-1',
      apiKeyId: 'api-key-1',
      cursor: null,
      pageSize: 1,
      maxConcurrent: 1,
      processedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      totalSourceCount: null,
      lastError: null,
      startedAt: new Date().toISOString(),
    });

    expect(result.cursor).toBe('source-2');
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      'reindex-batch',
      expect.objectContaining({
        jobId: 'chain-1',
        apiKeyId: 'api-key-1',
        cursor: 'source-2',
        processedCount: 2,
      }),
      expect.objectContaining({
        jobId: expect.stringMatching(
          /^reindex-maintenance__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$/,
        ),
      }),
    );
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

  it('startJob 立即返回 totalSourceCount，避免状态接口初始为空', async () => {
    const service = createService();
    sourceRepository.countActive.mockResolvedValue(42);

    const result = await service.startJob('api-key-1');

    expect(result.totalSourceCount).toBe(42);
    expect(queue.add).toHaveBeenCalledWith(
      'reindex-batch',
      expect.objectContaining({
        apiKeyId: 'api-key-1',
        totalSourceCount: 42,
      }),
      expect.objectContaining({
        jobId: expect.stringMatching(/^reindex-maintenance__[A-Za-z0-9_-]+$/),
      }),
    );
  });

  it('status 在没有运行中任务时仍返回最近一次 completed 任务的最终统计', async () => {
    const service = createService();
    queue.getJobs.mockResolvedValue([
      {
        data: {
          jobId: 'old-chain',
          apiKeyId: 'api-key-1',
          cursor: null,
          pageSize: 50,
          maxConcurrent: 3,
          processedCount: 3,
          failedCount: 0,
          skippedCount: 0,
          totalSourceCount: 3,
          lastError: null,
          startedAt: '2026-03-19T10:00:00.000Z',
        },
        getState: vi.fn().mockResolvedValue('completed'),
      },
      {
        data: {
          jobId: 'chain-1',
          apiKeyId: 'api-key-1',
          cursor: null,
          pageSize: 50,
          maxConcurrent: 3,
          processedCount: 12,
          failedCount: 1,
          skippedCount: 2,
          totalSourceCount: 15,
          lastError: 'embedding unavailable',
          startedAt: '2026-03-20T10:00:00.000Z',
        },
        getState: vi.fn().mockResolvedValue('completed'),
      },
      {
        data: {
          jobId: 'other-api-key-chain',
          apiKeyId: 'api-key-2',
          cursor: null,
          pageSize: 50,
          maxConcurrent: 3,
          processedCount: 99,
          failedCount: 0,
          skippedCount: 0,
          totalSourceCount: 99,
          lastError: null,
          startedAt: '2026-03-20T11:00:00.000Z',
        },
        getState: vi.fn().mockResolvedValue('completed'),
      },
    ]);

    const result = await service.getJobStatus('api-key-1');

    expect(result).toMatchObject({
      jobId: 'chain-1',
      apiKeyId: 'api-key-1',
      processedCount: 12,
      failedCount: 1,
      skippedCount: 2,
      totalSourceCount: 15,
      lastError: 'embedding unavailable',
    });
  });
});
