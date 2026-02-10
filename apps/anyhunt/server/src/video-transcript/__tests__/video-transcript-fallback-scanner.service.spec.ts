/**
 * [INPUT]: fallback 扫描配置与任务快照
 * [OUTPUT]: 超时任务 cloud-run 入队行为断言
 * [POS]: Video Transcript fallback 补偿扫描回归测试
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { VideoTranscriptFallbackScannerService } from '../video-transcript-fallback-scanner.service';
import type { VideoTranscriptService } from '../video-transcript.service';

describe('VideoTranscriptFallbackScannerService', () => {
  let service: VideoTranscriptFallbackScannerService;

  let mockPrisma: {
    $queryRaw: Mock;
  };
  let mockTranscriptService: {
    getFallbackTimeoutMs: Mock;
    enqueueCloudRun: Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
    mockTranscriptService = {
      getFallbackTimeoutMs: vi.fn().mockReturnValue(10 * 60 * 1000),
      enqueueCloudRun: vi.fn().mockResolvedValue(undefined),
    };

    service = new VideoTranscriptFallbackScannerService(
      mockPrisma as unknown as PrismaService,
      mockTranscriptService as unknown as VideoTranscriptService,
    );
  });

  it('should enqueue cloud-run for overdue local tasks', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { id: 'task_1' },
      { id: 'task_2' },
    ]);

    await service.scanTimeoutLocalTasks();

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockTranscriptService.enqueueCloudRun).toHaveBeenCalledWith(
      'task_1',
      'timeout',
    );
    expect(mockTranscriptService.enqueueCloudRun).toHaveBeenCalledWith(
      'task_2',
      'timeout',
    );
    expect(mockTranscriptService.enqueueCloudRun).toHaveBeenCalledTimes(2);
  });
});
