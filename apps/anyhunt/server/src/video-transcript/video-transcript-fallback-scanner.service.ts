/**
 * [INPUT]: 运行中的 local 任务状态 + fallback timeout 配置
 * [OUTPUT]: 超时任务 cloud-run 补偿入队（幂等）
 * [POS]: Video Transcript fallback 补偿扫描器（修复异常场景下的漏调度）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { VIDEO_TRANSCRIPT_FALLBACK_SCAN_INTERVAL_MS } from './video-transcript.constants';
import { VideoTranscriptService } from './video-transcript.service';

@Injectable()
export class VideoTranscriptFallbackScannerService {
  private readonly logger = new Logger(
    VideoTranscriptFallbackScannerService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly transcriptService: VideoTranscriptService,
  ) {}

  @Interval(VIDEO_TRANSCRIPT_FALLBACK_SCAN_INTERVAL_MS)
  async scanTimeoutLocalTasks(): Promise<void> {
    const timeoutMs = this.transcriptService.getFallbackTimeoutMs();

    const overdueTasks = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "VideoTranscriptTask"
      WHERE "executor" = 'LOCAL'::"VideoTranscriptExecutor"
        AND "localStartedAt" IS NOT NULL
        AND "localStartedAt" <= NOW() - (${timeoutMs} * INTERVAL '1 millisecond')
        AND "status" IN (
          'DOWNLOADING'::"VideoTranscriptTaskStatus",
          'EXTRACTING_AUDIO'::"VideoTranscriptTaskStatus",
          'TRANSCRIBING'::"VideoTranscriptTaskStatus",
          'UPLOADING'::"VideoTranscriptTaskStatus"
        )
      ORDER BY "localStartedAt" ASC
      LIMIT 200
    `;

    if (overdueTasks.length === 0) {
      return;
    }

    for (const task of overdueTasks) {
      try {
        await this.transcriptService.enqueueCloudRun(task.id, 'timeout');
      } catch (error) {
        this.logger.warn(
          `Failed to enqueue cloud fallback for overdue task ${task.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
