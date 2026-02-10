/**
 * [INPUT]: LOCAL 队列任务（taskId）
 * [OUTPUT]: 本地下载 + 音频抽取 + Whisper 转写 + R2 上传 + 状态回写
 * [POS]: Video Transcript LOCAL 执行器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { VideoTranscriptExecutorService } from './video-transcript-executor.service';
import { VideoTranscriptArtifactService } from './video-transcript-artifact.service';
import { VideoTranscriptService } from './video-transcript.service';
import { VIDEO_TRANSCRIPT_LOCAL_QUEUE } from '../queue/queue.constants';
import type {
  VideoTranscriptLocalJobData,
  VideoTranscriptResult,
} from './video-transcript.types';
import { VideoTranscriptPreemptedError } from './video-transcript.errors';
import { VideoTranscriptHeartbeatService } from './video-transcript-heartbeat.service';

@Processor(VIDEO_TRANSCRIPT_LOCAL_QUEUE)
export class VideoTranscriptLocalProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoTranscriptLocalProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transcriptService: VideoTranscriptService,
    private readonly executorService: VideoTranscriptExecutorService,
    private readonly artifactService: VideoTranscriptArtifactService,
    private readonly heartbeatService: VideoTranscriptHeartbeatService,
  ) {
    super();
  }

  async process(job: Job<VideoTranscriptLocalJobData>): Promise<void> {
    const { taskId } = job.data;

    const task = await this.prisma.videoTranscriptTask.findUnique({
      where: { id: taskId },
    });
    if (!task || this.transcriptService.isTerminalStatus(task.status)) {
      return;
    }

    this.heartbeatService.incrementActiveTasks();
    let workspaceDir: string | null = null;
    let localStarted = false;

    try {
      workspaceDir = await this.executorService.createWorkspace(taskId);

      await this.markLocalStarted(taskId);
      localStarted = true;
      await this.scheduleFallbackCheckSafely(taskId);
      await this.ensureNotPreempted(taskId);

      const videoPath = await this.executorService.downloadVideo(
        task.sourceUrl,
        workspaceDir,
      );

      await this.ensureNotPreempted(taskId);
      await this.updateLocalStatus(taskId, 'EXTRACTING_AUDIO');

      const audioPath = `${workspaceDir}/audio.wav`;
      await this.executorService.extractAudio(videoPath, audioPath);

      await this.ensureNotPreempted(taskId);
      await this.updateLocalStatus(taskId, 'TRANSCRIBING');

      const localOutput = await this.executorService.transcribeLocal(
        audioPath,
        `${workspaceDir}/transcript`,
      );
      const durationSec =
        await this.executorService.getAudioDurationSeconds(audioPath);

      await this.ensureNotPreempted(taskId);
      await this.updateLocalStatus(taskId, 'UPLOADING');

      const result: VideoTranscriptResult = {
        text: localOutput.text,
        segments: localOutput.segments,
        durationSec,
        languageDetected: localOutput.languageDetected,
      };

      const artifacts = await this.artifactService.uploadArtifacts({
        userId: task.userId,
        taskId,
        videoPath,
        audioPath,
        txtPath: localOutput.txtPath,
        jsonPath: localOutput.jsonPath,
        srtPath: localOutput.srtPath,
        result,
      });

      const completed = await this.prisma.videoTranscriptTask.updateMany({
        where: {
          id: taskId,
          executor: 'LOCAL',
          status: {
            notIn: ['COMPLETED', 'FAILED', 'CANCELLED'],
          },
        },
        data: {
          status: 'COMPLETED',
          executor: 'LOCAL',
          artifacts: this.transcriptService.toPrismaJson(artifacts),
          result: this.transcriptService.toPrismaJson(result),
          error: null,
          completedAt: new Date(),
        },
      });
      if (completed.count === 0) {
        return;
      }

      await this.transcriptService.clearFallbackJobs(taskId);
    } catch (error) {
      if (error instanceof VideoTranscriptPreemptedError) {
        this.logger.warn(`Task preempted by cloud fallback: ${taskId}`);
        return;
      }

      const latest = await this.prisma.videoTranscriptTask.findUnique({
        where: { id: taskId },
      });
      if (latest && this.transcriptService.isTerminalStatus(latest.status)) {
        return;
      }

      if (localStarted) {
        if (latest && latest.executor !== 'LOCAL') {
          // 已被 cloud 接管或执行权已转移，local 失败不应覆盖任务状态
          return;
        }

        const failed = await this.prisma.videoTranscriptTask.updateMany({
          where: {
            id: taskId,
            executor: 'LOCAL',
            status: {
              notIn: ['COMPLETED', 'FAILED', 'CANCELLED'],
            },
          },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : String(error),
            completedAt: new Date(),
          },
        });
        if (failed.count === 0) {
          return;
        }
      } else {
        const failed = await this.prisma.videoTranscriptTask.updateMany({
          where: {
            id: taskId,
            status: {
              notIn: ['COMPLETED', 'FAILED', 'CANCELLED'],
            },
          },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : String(error),
            completedAt: new Date(),
          },
        });
        if (failed.count === 0) {
          return;
        }
      }

      throw error;
    } finally {
      if (workspaceDir) {
        await this.executorService.cleanupWorkspace(workspaceDir);
      }
      this.heartbeatService.decrementActiveTasks();
    }
  }

  private async ensureNotPreempted(taskId: string): Promise<void> {
    const preempted = await this.transcriptService.isPreempted(taskId);
    if (preempted) {
      throw new VideoTranscriptPreemptedError(taskId);
    }

    const task = await this.prisma.videoTranscriptTask.findUnique({
      where: { id: taskId },
      select: { status: true, executor: true },
    });

    if (
      !task ||
      task.executor !== 'LOCAL' ||
      this.transcriptService.isTerminalStatus(task.status)
    ) {
      throw new VideoTranscriptPreemptedError(taskId);
    }
  }

  private async markLocalStarted(taskId: string): Promise<void> {
    const affected = await this.prisma.$executeRaw`
      UPDATE "VideoTranscriptTask"
      SET
        "status" = 'DOWNLOADING'::"VideoTranscriptTaskStatus",
        "executor" = 'LOCAL'::"VideoTranscriptExecutor",
        "localStartedAt" = COALESCE("localStartedAt", NOW()),
        "startedAt" = COALESCE("startedAt", NOW()),
        "error" = NULL,
        "updatedAt" = NOW()
      WHERE "id" = ${taskId}
        AND "status" NOT IN (
          'COMPLETED'::"VideoTranscriptTaskStatus",
          'FAILED'::"VideoTranscriptTaskStatus",
          'CANCELLED'::"VideoTranscriptTaskStatus"
        )
    `;

    if (affected === 0) {
      throw new VideoTranscriptPreemptedError(taskId);
    }
  }

  private async updateLocalStatus(
    taskId: string,
    status: 'EXTRACTING_AUDIO' | 'TRANSCRIBING' | 'UPLOADING',
  ): Promise<void> {
    const updated = await this.prisma.videoTranscriptTask.updateMany({
      where: {
        id: taskId,
        executor: 'LOCAL',
        status: {
          notIn: ['COMPLETED', 'FAILED', 'CANCELLED'],
        },
      },
      data: {
        status,
      },
    });

    if (updated.count === 0) {
      throw new VideoTranscriptPreemptedError(taskId);
    }
  }

  private async scheduleFallbackCheckSafely(taskId: string): Promise<void> {
    try {
      await this.transcriptService.scheduleFallbackCheck(taskId);
    } catch (error) {
      // fallback-check 丢失时由 scanner 补偿，不能阻断 local 主流程
      this.logger.warn(
        `Failed to schedule fallback-check for ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
