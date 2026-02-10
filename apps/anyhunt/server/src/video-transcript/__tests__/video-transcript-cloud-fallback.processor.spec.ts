/**
 * [INPUT]: CLOUD_FALLBACK processor 任务执行依赖 mock
 * [OUTPUT]: timeout 路径接管前失败容错与接管后失败行为断言
 * [POS]: Video Transcript CLOUD_FALLBACK processor 回归测试
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoTranscriptCloudFallbackProcessor } from '../video-transcript-cloud-fallback.processor';

describe('VideoTranscriptCloudFallbackProcessor', () => {
  let processor: VideoTranscriptCloudFallbackProcessor;

  let mockPrisma: any;
  let mockTranscriptService: any;
  let mockExecutorService: any;
  let mockArtifactService: any;
  let mockBudgetService: any;
  let mockCloudQueue: any;

  beforeEach(() => {
    const task = {
      id: 'task_1',
      userId: 'user_1',
      sourceUrl: 'https://youtube.com/watch?v=abc123',
      status: 'TRANSCRIBING',
      executor: 'LOCAL',
      localStartedAt: new Date('2026-02-09T09:00:00.000Z'),
      startedAt: null,
    };

    mockPrisma = {
      videoTranscriptTask: {
        findUnique: vi.fn().mockResolvedValue(task),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ due: true }]),
    };

    mockTranscriptService = {
      isTerminalStatus: vi.fn((status: string) =>
        ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status),
      ),
      setPreemptSignal: vi.fn().mockResolvedValue(undefined),
      toPrismaJson: vi.fn((value: unknown) => value),
      getFallbackTimeoutMs: vi.fn().mockReturnValue(10 * 60 * 1000),
    };

    mockExecutorService = {
      probeVideoDurationSeconds: vi.fn().mockResolvedValue(0),
      createWorkspace: vi.fn().mockResolvedValue('/tmp/video-task-1'),
      downloadVideo: vi.fn().mockRejectedValue(new Error('download failed')),
      extractAudio: vi.fn(),
      getAudioDurationSeconds: vi.fn(),
      transcribeCloud: vi.fn(),
      cleanupWorkspace: vi.fn().mockResolvedValue(undefined),
    };

    mockArtifactService = {
      uploadArtifacts: vi.fn(),
    };

    mockBudgetService = {
      tryReserveCloudBudget: vi.fn().mockResolvedValue({
        allowed: true,
        estimatedCostUsd: 0.01,
        usageAfterReserveUsd: 0.01,
        dailyBudgetUsd: 20,
        dayKey: '2026-02-09',
        timezone: 'Asia/Shanghai',
      }),
    };

    mockCloudQueue = {
      add: vi.fn(),
    };

    processor = new VideoTranscriptCloudFallbackProcessor(
      mockPrisma,
      mockTranscriptService,
      mockExecutorService,
      mockArtifactService,
      mockBudgetService,
      mockCloudQueue,
    );
  });

  it('should not fail task when timeout pre-check fails before takeover', async () => {
    await expect(
      processor.process({
        data: {
          kind: 'cloud-run',
          taskId: 'task_1',
          reason: 'timeout',
        },
      } as any),
    ).resolves.toBeUndefined();

    expect(mockTranscriptService.setPreemptSignal).not.toHaveBeenCalled();
    expect(mockPrisma.videoTranscriptTask.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      }),
    );
  });

  it('should mark FAILED when timeout cloud run has already taken over', async () => {
    mockExecutorService.probeVideoDurationSeconds.mockResolvedValue(120);
    mockPrisma.videoTranscriptTask.findUnique = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'task_1',
        userId: 'user_1',
        sourceUrl: 'https://youtube.com/watch?v=abc123',
        status: 'TRANSCRIBING',
        executor: 'LOCAL',
        localStartedAt: new Date('2026-02-09T09:00:00.000Z'),
        startedAt: null,
      })
      .mockResolvedValueOnce({
        id: 'task_1',
        userId: 'user_1',
        sourceUrl: 'https://youtube.com/watch?v=abc123',
        status: 'DOWNLOADING',
        executor: 'CLOUD_FALLBACK',
        localStartedAt: new Date('2026-02-09T09:00:00.000Z'),
        startedAt: null,
      });

    await expect(
      processor.process({
        data: {
          kind: 'cloud-run',
          taskId: 'task_1',
          reason: 'timeout',
        },
      } as any),
    ).rejects.toThrow('download failed');

    expect(mockTranscriptService.setPreemptSignal).toHaveBeenCalledWith(
      'task_1',
    );
    expect(mockPrisma.videoTranscriptTask.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      }),
    );
  });

  it('should mark FAILED when workspace creation fails after timeout takeover', async () => {
    mockExecutorService.probeVideoDurationSeconds.mockResolvedValue(120);
    mockExecutorService.createWorkspace.mockRejectedValue(
      new Error('workspace unavailable'),
    );
    mockPrisma.videoTranscriptTask.findUnique = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'task_1',
        userId: 'user_1',
        sourceUrl: 'https://youtube.com/watch?v=abc123',
        status: 'TRANSCRIBING',
        executor: 'LOCAL',
        localStartedAt: new Date('2026-02-09T09:00:00.000Z'),
        startedAt: null,
      })
      .mockResolvedValueOnce({
        id: 'task_1',
        userId: 'user_1',
        sourceUrl: 'https://youtube.com/watch?v=abc123',
        status: 'DOWNLOADING',
        executor: 'CLOUD_FALLBACK',
        localStartedAt: new Date('2026-02-09T09:00:00.000Z'),
        startedAt: null,
      });

    await expect(
      processor.process({
        data: {
          kind: 'cloud-run',
          taskId: 'task_1',
          reason: 'timeout',
        },
      } as any),
    ).rejects.toThrow('workspace unavailable');

    expect(mockTranscriptService.setPreemptSignal).toHaveBeenCalledWith(
      'task_1',
    );
    expect(mockPrisma.videoTranscriptTask.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      }),
    );
  });

  it('should not overwrite CANCELLED when cloud run completes', async () => {
    const initialTask = {
      id: 'task_1',
      userId: 'user_1',
      sourceUrl: 'https://youtube.com/watch?v=abc123',
      status: 'TRANSCRIBING',
      executor: 'LOCAL',
      localStartedAt: new Date('2026-02-09T09:00:00.000Z'),
      startedAt: null,
    };

    mockPrisma.videoTranscriptTask.findUnique = vi
      .fn()
      .mockResolvedValueOnce(initialTask);

    mockPrisma.videoTranscriptTask.updateMany = vi.fn((args: any) => {
      if (args?.data?.status === 'COMPLETED') {
        return Promise.resolve({ count: 0 });
      }
      return Promise.resolve({ count: 1 });
    });

    mockExecutorService.downloadVideo.mockResolvedValue('/tmp/video.mp4');
    mockExecutorService.extractAudio.mockResolvedValue(undefined);
    mockExecutorService.getAudioDurationSeconds.mockResolvedValue(123);
    mockExecutorService.transcribeCloud.mockResolvedValue({
      text: 'hello world',
      segments: [],
      languageDetected: 'en',
      txtPath: '/tmp/transcript.txt',
      jsonPath: '/tmp/transcript.json',
      srtPath: '/tmp/transcript.srt',
    });
    mockArtifactService.uploadArtifacts.mockResolvedValue({
      userId: 'user_1',
      vaultId: 'video-transcripts',
    });

    await expect(
      processor.process({
        data: {
          kind: 'cloud-run',
          taskId: 'task_1',
          reason: 'timeout',
        },
      } as any),
    ).resolves.toBeUndefined();

    expect(mockPrisma.videoTranscriptTask.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          executor: 'CLOUD_FALLBACK',
          status: {
            notIn: ['COMPLETED', 'FAILED', 'CANCELLED'],
          },
        }),
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });
});
