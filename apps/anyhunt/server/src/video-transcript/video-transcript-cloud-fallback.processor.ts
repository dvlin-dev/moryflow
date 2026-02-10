/**
 * [INPUT]: CLOUD_FALLBACK 队列任务（fallback-check / cloud-run）
 * [OUTPUT]: 超时检查 + 云端转写兜底执行 + 状态回写
 * [POS]: Video Transcript Cloud Fallback 执行器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { VideoTranscriptExecutorService } from './video-transcript-executor.service';
import { VideoTranscriptArtifactService } from './video-transcript-artifact.service';
import { VideoTranscriptService } from './video-transcript.service';
import {
  VIDEO_TRANSCRIPT_CLOUD_BUDGET_ALERT_RATIO,
  buildVideoTranscriptCloudRunJobId,
} from './video-transcript.constants';
import { VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE } from '../queue/queue.constants';
import type {
  VideoTranscriptCloudJobData,
  VideoTranscriptResult,
} from './video-transcript.types';
import { VideoTranscriptBudgetService } from './video-transcript-budget.service';

@Processor(VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE)
export class VideoTranscriptCloudFallbackProcessor extends WorkerHost {
  private readonly logger = new Logger(
    VideoTranscriptCloudFallbackProcessor.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly transcriptService: VideoTranscriptService,
    private readonly executorService: VideoTranscriptExecutorService,
    private readonly artifactService: VideoTranscriptArtifactService,
    private readonly budgetService: VideoTranscriptBudgetService,
    @InjectQueue(VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE)
    private readonly cloudQueue: Queue<VideoTranscriptCloudJobData>,
  ) {
    super();
  }

  async process(job: Job<VideoTranscriptCloudJobData>): Promise<void> {
    const { kind, taskId, reason } = job.data;

    if (kind === 'fallback-check') {
      await this.handleFallbackCheck(taskId);
      return;
    }

    await this.handleCloudRun(taskId, reason ?? 'timeout');
  }

  private async handleFallbackCheck(taskId: string): Promise<void> {
    const task = await this.prisma.videoTranscriptTask.findUnique({
      where: { id: taskId },
    });

    if (!task || this.transcriptService.isTerminalStatus(task.status)) {
      return;
    }

    if (!task.localStartedAt) {
      return;
    }

    const due = await this.isFallbackDue(taskId);
    if (!due) {
      return;
    }

    await this.cloudQueue.add(
      'video-transcript-cloud',
      {
        kind: 'cloud-run',
        taskId,
        reason: 'timeout',
      },
      {
        jobId: buildVideoTranscriptCloudRunJobId(taskId),
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  private async handleCloudRun(
    taskId: string,
    reason: 'timeout' | 'local-disabled',
  ): Promise<void> {
    const task = await this.prisma.videoTranscriptTask.findUnique({
      where: { id: taskId },
    });

    if (!task || this.transcriptService.isTerminalStatus(task.status)) {
      return;
    }

    if (reason === 'timeout' && !task.localStartedAt) {
      return;
    }

    if (reason === 'timeout' && task.localStartedAt) {
      const due = await this.isFallbackDue(taskId);
      if (!due) {
        return;
      }
    }

    let cloudOwnershipAcquired = false;
    let preemptSignaled = false;
    let budgetReservation: Awaited<
      ReturnType<VideoTranscriptBudgetService['tryReserveCloudBudget']>
    > | null = null;
    let budgetReservedByProbe = false;
    const startedAt = task.startedAt ?? new Date();

    if (reason === 'local-disabled') {
      cloudOwnershipAcquired = await this.acquireCloudOwnership(
        taskId,
        'DOWNLOADING',
        startedAt,
      );
      if (!cloudOwnershipAcquired) {
        return;
      }
    }

    const probedDurationSec =
      await this.executorService.probeVideoDurationSeconds(task.sourceUrl);

    if (probedDurationSec > 0) {
      budgetReservation =
        await this.budgetService.tryReserveCloudBudget(probedDurationSec);
      budgetReservedByProbe = true;

      if (!budgetReservation.allowed) {
        await this.handleBudgetExceeded(taskId, reason, cloudOwnershipAcquired);
        return;
      }

      if (reason === 'timeout') {
        cloudOwnershipAcquired = await this.acquireCloudOwnership(
          taskId,
          'DOWNLOADING',
          startedAt,
        );
        if (!cloudOwnershipAcquired) {
          return;
        }
        await this.transcriptService.setPreemptSignal(taskId);
        preemptSignaled = true;
      }
    }

    let workspaceDir: string | null = null;

    try {
      workspaceDir = await this.executorService.createWorkspace(taskId);
      const videoPath = await this.executorService.downloadVideo(
        task.sourceUrl,
        workspaceDir,
      );
      const audioPath = `${workspaceDir}/audio.wav`;

      if (cloudOwnershipAcquired) {
        const advanced = await this.advanceCloudStatus(
          taskId,
          'EXTRACTING_AUDIO',
        );
        if (!advanced) {
          return;
        }
      }

      await this.executorService.extractAudio(videoPath, audioPath);
      const durationSec =
        await this.executorService.getAudioDurationSeconds(audioPath);

      if (!budgetReservedByProbe) {
        budgetReservation =
          await this.budgetService.tryReserveCloudBudget(durationSec);
        if (!budgetReservation.allowed) {
          await this.handleBudgetExceeded(
            taskId,
            reason,
            cloudOwnershipAcquired,
          );
          return;
        }
      }

      if (reason === 'timeout' && !preemptSignaled) {
        cloudOwnershipAcquired = await this.acquireCloudOwnership(
          taskId,
          'DOWNLOADING',
          startedAt,
        );
        if (!cloudOwnershipAcquired) {
          return;
        }
        await this.transcriptService.setPreemptSignal(taskId);
        preemptSignaled = true;
      }

      if (!cloudOwnershipAcquired) {
        cloudOwnershipAcquired = await this.acquireCloudOwnership(
          taskId,
          'DOWNLOADING',
          startedAt,
        );
        if (!cloudOwnershipAcquired) {
          return;
        }
      }

      const transcribing = await this.advanceCloudStatus(
        taskId,
        'TRANSCRIBING',
      );
      if (!transcribing) {
        return;
      }

      const cloudOutput = await this.executorService.transcribeCloud(
        audioPath,
        `${workspaceDir}/transcript`,
      );

      const uploading = await this.advanceCloudStatus(taskId, 'UPLOADING');
      if (!uploading) {
        return;
      }

      const result: VideoTranscriptResult = {
        text: cloudOutput.text,
        segments: cloudOutput.segments,
        durationSec,
        languageDetected: cloudOutput.languageDetected,
      };

      const artifacts = await this.artifactService.uploadArtifacts({
        userId: task.userId,
        taskId,
        videoPath,
        audioPath,
        txtPath: cloudOutput.txtPath,
        jsonPath: cloudOutput.jsonPath,
        srtPath: cloudOutput.srtPath,
        result,
      });

      const completed = await this.prisma.videoTranscriptTask.updateMany({
        where: {
          id: taskId,
          executor: 'CLOUD_FALLBACK',
          status: {
            notIn: ['COMPLETED', 'FAILED', 'CANCELLED'],
          },
        },
        data: {
          status: 'COMPLETED',
          executor: 'CLOUD_FALLBACK',
          artifacts: this.transcriptService.toPrismaJson(artifacts),
          result: this.transcriptService.toPrismaJson(result),
          error: null,
          completedAt: new Date(),
        },
      });
      if (completed.count === 0) {
        return;
      }

      if (
        budgetReservation &&
        budgetReservation.dailyBudgetUsd > 0 &&
        budgetReservation.usageAfterReserveUsd /
          budgetReservation.dailyBudgetUsd >=
          VIDEO_TRANSCRIPT_CLOUD_BUDGET_ALERT_RATIO
      ) {
        this.logger.warn(
          `Cloud fallback budget usage above 80%: ${budgetReservation.usageAfterReserveUsd}/${budgetReservation.dailyBudgetUsd} (${budgetReservation.dayKey} ${budgetReservation.timezone})`,
        );
      }
    } catch (error) {
      const latest = await this.prisma.videoTranscriptTask.findUnique({
        where: { id: taskId },
      });

      if (!latest || this.transcriptService.isTerminalStatus(latest.status)) {
        return;
      }

      if (reason === 'timeout' && !cloudOwnershipAcquired) {
        this.logger.warn(
          `Cloud fallback pre-check failed before takeover for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
      }

      if (latest.executor !== 'CLOUD_FALLBACK') {
        // 执行权已不在 cloud（可能被终态/其他执行器抢占），避免覆盖状态
        return;
      }

      const failed = await this.prisma.videoTranscriptTask.updateMany({
        where: {
          id: taskId,
          executor: 'CLOUD_FALLBACK',
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

      throw error;
    } finally {
      if (workspaceDir) {
        await this.executorService.cleanupWorkspace(workspaceDir);
      }
    }
  }

  private async handleBudgetExceeded(
    taskId: string,
    reason: 'timeout' | 'local-disabled',
    cloudOwnershipAcquired: boolean,
  ): Promise<void> {
    if (reason === 'local-disabled' || cloudOwnershipAcquired) {
      await this.prisma.videoTranscriptTask.updateMany({
        where: {
          id: taskId,
          executor: 'CLOUD_FALLBACK',
          status: {
            notIn: ['COMPLETED', 'FAILED', 'CANCELLED'],
          },
        },
        data: {
          status: 'FAILED',
          error: 'Cloud fallback daily budget exceeded',
          completedAt: new Date(),
        },
      });
      return;
    }

    await this.prisma.videoTranscriptTask.updateMany({
      where: {
        id: taskId,
        executor: 'LOCAL',
        status: {
          notIn: ['COMPLETED', 'FAILED', 'CANCELLED'],
        },
      },
      data: {
        error: 'Cloud fallback daily budget exceeded',
      },
    });
  }

  private async acquireCloudOwnership(
    taskId: string,
    status: 'DOWNLOADING',
    startedAt: Date,
  ): Promise<boolean> {
    const acquired = await this.prisma.videoTranscriptTask.updateMany({
      where: {
        id: taskId,
        status: {
          notIn: ['COMPLETED', 'FAILED', 'CANCELLED'],
        },
      },
      data: {
        status,
        executor: 'CLOUD_FALLBACK',
        startedAt,
        error: null,
      },
    });

    return acquired.count > 0;
  }

  private async advanceCloudStatus(
    taskId: string,
    status: 'EXTRACTING_AUDIO' | 'TRANSCRIBING' | 'UPLOADING',
  ): Promise<boolean> {
    const updated = await this.prisma.videoTranscriptTask.updateMany({
      where: {
        id: taskId,
        executor: 'CLOUD_FALLBACK',
        status: {
          notIn: ['COMPLETED', 'FAILED', 'CANCELLED'],
        },
      },
      data: {
        status,
        error: null,
      },
    });

    return updated.count > 0;
  }

  private async isFallbackDue(taskId: string): Promise<boolean> {
    const timeoutMs = this.transcriptService.getFallbackTimeoutMs();
    const rows = await this.prisma.$queryRaw<Array<{ due: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM "VideoTranscriptTask"
        WHERE "id" = ${taskId}
          AND "localStartedAt" IS NOT NULL
          AND "localStartedAt" <= NOW() - (${timeoutMs} * INTERVAL '1 millisecond')
      ) AS "due"
    `;

    return rows[0]?.due === true;
  }
}
