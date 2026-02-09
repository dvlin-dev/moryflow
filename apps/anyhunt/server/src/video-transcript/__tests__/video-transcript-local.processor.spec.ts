/**
 * [INPUT]: LOCAL processor 任务执行依赖 mock
 * [OUTPUT]: fallback-check 失败容错与任务执行行为断言
 * [POS]: Video Transcript LOCAL processor 回归测试
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoTranscriptLocalProcessor } from '../video-transcript-local.processor';

describe('VideoTranscriptLocalProcessor', () => {
  let processor: VideoTranscriptLocalProcessor;

  let mockPrisma: any;
  let mockTranscriptService: any;
  let mockExecutorService: any;
  let mockArtifactService: any;
  let mockHeartbeatService: any;

  beforeEach(() => {
    mockPrisma = {
      videoTranscriptTask: {
        findUnique: vi.fn((args?: { select?: { status: true } }) => {
          if (args?.select?.status) {
            return Promise.resolve({ status: 'DOWNLOADING' });
          }
          return Promise.resolve({
            id: 'task_1',
            userId: 'user_1',
            sourceUrl: 'https://youtube.com/watch?v=abc123',
            status: 'PENDING',
          });
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      $executeRaw: vi.fn().mockResolvedValue(1),
    };

    mockTranscriptService = {
      scheduleFallbackCheck: vi
        .fn()
        .mockRejectedValue(new Error('queue unavailable')),
      isPreempted: vi.fn().mockResolvedValue(false),
      isTerminalStatus: vi.fn((status: string) =>
        ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status),
      ),
      toPrismaJson: vi.fn((value: unknown) => value),
      clearFallbackJobs: vi.fn().mockResolvedValue(undefined),
    };

    mockExecutorService = {
      createWorkspace: vi.fn().mockResolvedValue('/tmp/video-task-1'),
      downloadVideo: vi.fn().mockResolvedValue('/tmp/video-task-1/video.mp4'),
      extractAudio: vi.fn().mockResolvedValue(undefined),
      transcribeLocal: vi.fn().mockResolvedValue({
        text: 'hello world',
        segments: [],
        txtPath: '/tmp/video-task-1/transcript.txt',
        jsonPath: '/tmp/video-task-1/transcript.json',
        srtPath: '/tmp/video-task-1/transcript.srt',
      }),
      getAudioDurationSeconds: vi.fn().mockResolvedValue(12.345),
      cleanupWorkspace: vi.fn().mockResolvedValue(undefined),
    };

    mockArtifactService = {
      uploadArtifacts: vi.fn().mockResolvedValue({
        userId: 'user_1',
        vaultId: 'video-transcripts',
      }),
    };

    mockHeartbeatService = {
      incrementActiveTasks: vi.fn(),
      decrementActiveTasks: vi.fn(),
    };

    processor = new VideoTranscriptLocalProcessor(
      mockPrisma,
      mockTranscriptService,
      mockExecutorService,
      mockArtifactService,
      mockHeartbeatService,
    );
  });

  it('should continue local pipeline when fallback-check scheduling fails', async () => {
    await expect(
      processor.process({ data: { taskId: 'task_1' } } as any),
    ).resolves.toBeUndefined();

    expect(mockTranscriptService.scheduleFallbackCheck).toHaveBeenCalledWith(
      'task_1',
    );
    expect(mockExecutorService.downloadVideo).toHaveBeenCalledTimes(1);
    expect(mockPrisma.videoTranscriptTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task_1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          executor: 'LOCAL',
        }),
      }),
    );
    expect(mockHeartbeatService.incrementActiveTasks).toHaveBeenCalledTimes(1);
    expect(mockHeartbeatService.decrementActiveTasks).toHaveBeenCalledTimes(1);
  });
});
