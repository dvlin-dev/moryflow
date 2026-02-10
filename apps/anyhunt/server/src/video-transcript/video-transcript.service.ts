/**
 * [INPUT]: 用户提交的视频链接与任务操作请求
 * [OUTPUT]: VideoTranscriptTask 创建/查询/取消结果
 * [POS]: Video Transcript 业务编排入口（API + 队列投递）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type {
  Prisma,
  VideoTranscriptTask,
} from '../../generated/prisma-main/client';
import {
  VIDEO_TRANSCRIPT_FALLBACK_TIMEOUT_MS,
  VIDEO_TRANSCRIPT_PREEMPT_TTL_SECONDS,
  VIDEO_TRANSCRIPT_SUPPORTED_HOSTS,
  VIDEO_TRANSCRIPT_TERMINAL_STATUSES,
  VIDEO_TRANSCRIPT_TRACKING_QUERY_KEYS,
  buildVideoTranscriptCloudRunJobId,
  buildVideoTranscriptFallbackCheckJobId,
  buildVideoTranscriptPreemptKey,
} from './video-transcript.constants';
import {
  VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE,
  VIDEO_TRANSCRIPT_LOCAL_QUEUE,
} from '../queue/queue.constants';
import {
  InvalidVideoSourceUrlError,
  UnsupportedVideoPlatformError,
  VideoTranscriptTaskNotFoundError,
} from './video-transcript.errors';
import type {
  VideoPlatform,
  VideoTranscriptCloudJobData,
  VideoTranscriptLocalJobData,
} from './video-transcript.types';
import { VideoTranscriptRuntimeConfigService } from './video-transcript-runtime-config.service';

@Injectable()
export class VideoTranscriptService {
  private readonly logger = new Logger(VideoTranscriptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly runtimeConfigService: VideoTranscriptRuntimeConfigService,
    @InjectQueue(VIDEO_TRANSCRIPT_LOCAL_QUEUE)
    private readonly localQueue: Queue<VideoTranscriptLocalJobData>,
    @InjectQueue(VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE)
    private readonly cloudQueue: Queue<VideoTranscriptCloudJobData>,
  ) {}

  async createTask(
    userId: string,
    rawUrl: string,
  ): Promise<VideoTranscriptTask> {
    const sourceUrl = this.normalizeSourceUrl(rawUrl);
    const platform = this.detectPlatform(sourceUrl);

    const task = await this.prisma.videoTranscriptTask.create({
      data: {
        userId,
        platform,
        sourceUrl,
        status: 'PENDING',
      },
    });

    if (await this.isLocalPathEnabled()) {
      await this.localQueue.add(
        'video-transcript-local',
        { taskId: task.id },
        {
          jobId: task.id,
          attempts: 1,
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
    } else {
      await this.cloudQueue.add(
        'video-transcript-cloud',
        {
          kind: 'cloud-run',
          taskId: task.id,
          reason: 'local-disabled',
        },
        {
          jobId: buildVideoTranscriptCloudRunJobId(task.id),
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

    return task;
  }

  async getTaskById(
    userId: string,
    taskId: string,
  ): Promise<VideoTranscriptTask> {
    const task = await this.prisma.videoTranscriptTask.findFirst({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!task) {
      throw new VideoTranscriptTaskNotFoundError(taskId);
    }

    return task;
  }

  async listTasks(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.videoTranscriptTask.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.videoTranscriptTask.count({
        where: { userId },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelTask(userId: string, taskId: string): Promise<{ ok: true }> {
    const task = await this.prisma.videoTranscriptTask.findFirst({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!task) {
      throw new VideoTranscriptTaskNotFoundError(taskId);
    }

    if (!this.isTerminalStatus(task.status)) {
      await this.redisService.set(
        buildVideoTranscriptPreemptKey(taskId),
        '1',
        VIDEO_TRANSCRIPT_PREEMPT_TTL_SECONDS,
      );

      await this.prisma.videoTranscriptTask.update({
        where: { id: taskId },
        data: {
          status: 'CANCELLED',
          error: 'Cancelled by user',
          completedAt: new Date(),
        },
      });
    }

    await Promise.allSettled([
      this.localQueue.remove(taskId),
      this.cloudQueue.remove(buildVideoTranscriptFallbackCheckJobId(taskId)),
      this.cloudQueue.remove(buildVideoTranscriptCloudRunJobId(taskId)),
    ]);

    return { ok: true };
  }

  async scheduleFallbackCheck(taskId: string): Promise<void> {
    await this.cloudQueue.add(
      'video-transcript-cloud',
      {
        kind: 'fallback-check',
        taskId,
        reason: 'timeout',
      },
      {
        jobId: buildVideoTranscriptFallbackCheckJobId(taskId),
        delay: this.getFallbackTimeoutMs(),
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async enqueueCloudRun(
    taskId: string,
    reason: 'timeout' | 'local-disabled',
  ): Promise<void> {
    await this.cloudQueue.add(
      'video-transcript-cloud',
      {
        kind: 'cloud-run',
        taskId,
        reason,
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

  async clearFallbackJobs(taskId: string): Promise<void> {
    await Promise.allSettled([
      this.cloudQueue.remove(buildVideoTranscriptFallbackCheckJobId(taskId)),
      this.cloudQueue.remove(buildVideoTranscriptCloudRunJobId(taskId)),
    ]);
  }

  async setPreemptSignal(taskId: string): Promise<void> {
    await this.redisService.set(
      buildVideoTranscriptPreemptKey(taskId),
      '1',
      VIDEO_TRANSCRIPT_PREEMPT_TTL_SECONDS,
    );
  }

  async isPreempted(taskId: string): Promise<boolean> {
    const value = await this.redisService.get(
      buildVideoTranscriptPreemptKey(taskId),
    );
    return value !== null;
  }

  isTerminalStatus(status: string): boolean {
    return VIDEO_TRANSCRIPT_TERMINAL_STATUSES.has(status);
  }

  toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  getFallbackTimeoutMs(): number {
    const configured = Number(
      this.configService.get<string>(
        'VIDEO_TRANSCRIPT_FALLBACK_TIMEOUT_MS',
        String(VIDEO_TRANSCRIPT_FALLBACK_TIMEOUT_MS),
      ),
    );

    if (!Number.isFinite(configured) || configured <= 0) {
      return VIDEO_TRANSCRIPT_FALLBACK_TIMEOUT_MS;
    }

    return configured;
  }

  private async isLocalPathEnabled(): Promise<boolean> {
    const snapshot = await this.runtimeConfigService.getSnapshot();
    return snapshot.localEnabled;
  }

  private normalizeSourceUrl(rawUrl: string): string {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl.trim());
    } catch {
      throw new InvalidVideoSourceUrlError(rawUrl);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new InvalidVideoSourceUrlError(rawUrl);
    }

    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    for (const key of VIDEO_TRANSCRIPT_TRACKING_QUERY_KEYS) {
      parsed.searchParams.delete(key);
    }

    if (parsed.hostname === 'youtu.be') {
      const videoId = parsed.pathname.replace(/^\//, '').trim();
      if (videoId) {
        parsed.hostname = 'youtube.com';
        parsed.pathname = '/watch';
        parsed.searchParams.set('v', videoId);
      }
    }

    return parsed.toString();
  }

  private detectPlatform(sourceUrl: string): VideoPlatform {
    let hostname = '';
    try {
      hostname = new URL(sourceUrl).hostname
        .toLowerCase()
        .replace(/\.$/, '')
        .replace(/^www\./, '');
    } catch {
      throw new InvalidVideoSourceUrlError(sourceUrl);
    }

    const matchesHost = (host: string) =>
      hostname === host || hostname.endsWith(`.${host}`);

    if (!VIDEO_TRANSCRIPT_SUPPORTED_HOSTS.some(matchesHost)) {
      throw new UnsupportedVideoPlatformError(sourceUrl);
    }

    if (matchesHost('douyin.com') || matchesHost('iesdouyin.com')) {
      return 'douyin';
    }

    if (matchesHost('bilibili.com') || matchesHost('b23.tv')) {
      return 'bilibili';
    }

    if (matchesHost('xiaohongshu.com') || matchesHost('xhslink.com')) {
      return 'xiaohongshu';
    }

    if (matchesHost('youtube.com') || matchesHost('youtu.be')) {
      return 'youtube';
    }

    this.logger.warn(`Unknown platform host fallback: ${hostname}`);
    return hostname;
  }
}
