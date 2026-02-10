/**
 * [INPUT]: VideoTranscriptService 方法调用参数
 * [OUTPUT]: 任务创建/取消/队列调度行为断言结果
 * [POS]: Video Transcript Service 回归测试
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { VideoTranscriptService } from '../video-transcript.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';
import type { RedisService } from '../../redis/redis.service';
import type { Queue } from 'bullmq';
import type { VideoTranscriptRuntimeConfigService } from '../video-transcript-runtime-config.service';
import {
  buildVideoTranscriptCloudRunJobId,
  buildVideoTranscriptFallbackCheckJobId,
} from '../video-transcript.constants';
import {
  InvalidVideoSourceUrlError,
  UnsupportedVideoPlatformError,
  VideoTranscriptTaskNotFoundError,
} from '../video-transcript.errors';

describe('VideoTranscriptService', () => {
  let service: VideoTranscriptService;

  let mockPrisma: {
    videoTranscriptTask: {
      create: Mock;
      findFirst: Mock;
      findMany: Mock;
      count: Mock;
      update: Mock;
    };
  };

  let mockConfigService: {
    get: Mock;
  };

  let mockRedisService: {
    set: Mock;
    get: Mock;
  };

  let mockRuntimeConfigService: {
    getSnapshot: Mock;
  };

  let mockLocalQueue: {
    add: Mock;
    remove: Mock;
  };

  let mockCloudQueue: {
    add: Mock;
    remove: Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      videoTranscriptTask: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    };

    mockConfigService = {
      get: vi.fn((key: string, fallback?: string) => fallback),
    };

    mockRedisService = {
      set: vi.fn(),
      get: vi.fn(),
    };

    mockRuntimeConfigService = {
      getSnapshot: vi.fn().mockResolvedValue({
        localEnabled: true,
        source: 'env',
        overrideRaw: null,
      }),
    };

    mockLocalQueue = {
      add: vi.fn(),
      remove: vi.fn(),
    };

    mockCloudQueue = {
      add: vi.fn(),
      remove: vi.fn(),
    };

    service = new VideoTranscriptService(
      mockPrisma as unknown as PrismaService,
      mockConfigService as unknown as ConfigService,
      mockRedisService as unknown as RedisService,
      mockRuntimeConfigService as unknown as VideoTranscriptRuntimeConfigService,
      mockLocalQueue as unknown as Queue,
      mockCloudQueue as unknown as Queue,
    );
  });

  describe('createTask', () => {
    it('should normalize sourceUrl and enqueue local queue by default', async () => {
      mockPrisma.videoTranscriptTask.create.mockResolvedValue({
        id: 'task_1',
        status: 'PENDING',
      });

      await service.createTask(
        'user_1',
        'https://youtu.be/abc123?utm_source=test&si=xyz',
      );

      expect(mockPrisma.videoTranscriptTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user_1',
            platform: 'youtube',
            sourceUrl: 'https://youtube.com/watch?v=abc123',
            status: 'PENDING',
          }),
        }),
      );

      expect(mockLocalQueue.add).toHaveBeenCalledWith(
        'video-transcript-local',
        { taskId: 'task_1' },
        expect.objectContaining({
          jobId: 'task_1',
        }),
      );
      expect(mockCloudQueue.add).not.toHaveBeenCalled();
    });

    it('should enqueue cloud queue directly when local path is disabled', async () => {
      mockRuntimeConfigService.getSnapshot.mockResolvedValue({
        localEnabled: false,
        source: 'override',
        overrideRaw: 'false',
      });
      mockPrisma.videoTranscriptTask.create.mockResolvedValue({
        id: 'task_2',
        status: 'PENDING',
      });

      await service.createTask(
        'user_1',
        'https://www.bilibili.com/video/BV1xx',
      );

      expect(mockCloudQueue.add).toHaveBeenCalledWith(
        'video-transcript-cloud',
        {
          kind: 'cloud-run',
          taskId: 'task_2',
          reason: 'local-disabled',
        },
        expect.objectContaining({
          jobId: buildVideoTranscriptCloudRunJobId('task_2'),
        }),
      );
      expect(mockLocalQueue.add).not.toHaveBeenCalled();
    });

    it('should reject invalid URL', async () => {
      await expect(
        service.createTask('user_1', 'not-a-valid-url'),
      ).rejects.toBeInstanceOf(InvalidVideoSourceUrlError);
    });

    it('should reject unsupported platform URL', async () => {
      await expect(
        service.createTask('user_1', 'https://example.com/video/123'),
      ).rejects.toBeInstanceOf(UnsupportedVideoPlatformError);
    });

    it('should reject hostnames that only suffix-match supported hosts', async () => {
      await expect(
        service.createTask('user_1', 'https://evilyoutube.com/watch?v=abc123'),
      ).rejects.toBeInstanceOf(UnsupportedVideoPlatformError);
    });
  });

  describe('cancelTask', () => {
    it('should set preempt signal and remove queued jobs when task is active', async () => {
      mockPrisma.videoTranscriptTask.findFirst.mockResolvedValue({
        id: 'task_3',
        userId: 'user_1',
        status: 'TRANSCRIBING',
      });
      mockPrisma.videoTranscriptTask.update.mockResolvedValue({
        id: 'task_3',
      });

      const result = await service.cancelTask('user_1', 'task_3');

      expect(result).toEqual({ ok: true });
      expect(mockRedisService.set).toHaveBeenCalledTimes(1);
      expect(mockPrisma.videoTranscriptTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task_3' },
          data: expect.objectContaining({
            status: 'CANCELLED',
            error: 'Cancelled by user',
          }),
        }),
      );
      expect(mockLocalQueue.remove).toHaveBeenCalledWith('task_3');
      expect(mockCloudQueue.remove).toHaveBeenCalledWith(
        buildVideoTranscriptFallbackCheckJobId('task_3'),
      );
      expect(mockCloudQueue.remove).toHaveBeenCalledWith(
        buildVideoTranscriptCloudRunJobId('task_3'),
      );
    });

    it('should throw when task does not exist', async () => {
      mockPrisma.videoTranscriptTask.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelTask('user_1', 'missing'),
      ).rejects.toBeInstanceOf(VideoTranscriptTaskNotFoundError);
    });
  });

  describe('scheduleFallbackCheck', () => {
    it('should enqueue fallback-check with configured delay', async () => {
      mockConfigService.get.mockImplementation(
        (key: string, fallback?: string) => {
          if (key === 'VIDEO_TRANSCRIPT_FALLBACK_TIMEOUT_MS') {
            return '600001';
          }
          return fallback;
        },
      );

      await service.scheduleFallbackCheck('task_4');

      expect(mockCloudQueue.add).toHaveBeenCalledWith(
        'video-transcript-cloud',
        {
          kind: 'fallback-check',
          taskId: 'task_4',
          reason: 'timeout',
        },
        expect.objectContaining({
          jobId: buildVideoTranscriptFallbackCheckJobId('task_4'),
          delay: 600001,
        }),
      );
    });
  });
});
