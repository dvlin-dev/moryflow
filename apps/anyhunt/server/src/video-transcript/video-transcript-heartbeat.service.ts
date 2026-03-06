/**
 * [INPUT]: Local worker 运行状态（activeTasks / 资源指标）
 * [OUTPUT]: Redis 心跳键 + 节点快照查询结果
 * [POS]: Video Transcript Local Worker 心跳与资源上报
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import os from 'node:os';
import {
  VIDEO_TRANSCRIPT_HEARTBEAT_INTERVAL_MS,
  VIDEO_TRANSCRIPT_HEARTBEAT_TTL_SECONDS,
  VIDEO_TRANSCRIPT_LOCAL_WORKER_NODE_ID_ENV,
  buildVideoTranscriptHeartbeatKey,
  parseBooleanEnv,
} from './video-transcript.constants';
import { RedisService } from '../redis/redis.service';
import type { VideoTranscriptHeartbeatPayload } from './video-transcript.types';

@Injectable()
export class VideoTranscriptHeartbeatService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(VideoTranscriptHeartbeatService.name);
  private timer: NodeJS.Timeout | null = null;
  private activeTasks = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit(): void {
    if (!this.isLocalWorkerEnabled()) {
      return;
    }

    this.reportHeartbeat().catch((error) => {
      this.logger.warn(`Initial heartbeat failed: ${String(error)}`);
    });

    this.timer = setInterval(() => {
      this.reportHeartbeat().catch((error) => {
        this.logger.warn(`Heartbeat report failed: ${String(error)}`);
      });
    }, VIDEO_TRANSCRIPT_HEARTBEAT_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  incrementActiveTasks(): void {
    this.activeTasks += 1;
  }

  decrementActiveTasks(): void {
    this.activeTasks = Math.max(0, this.activeTasks - 1);
  }

  async getLiveNodes(): Promise<VideoTranscriptHeartbeatPayload[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await this.redisService.client.scan(
        cursor,
        'MATCH',
        'video:worker:local:*:heartbeat',
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (batch.length > 0) {
        keys.push(...batch);
      }
    } while (cursor !== '0');

    if (keys.length === 0) {
      return [];
    }

    const values = await this.redisService.client.mget(keys);
    const nodes = values
      .map((value) => {
        if (!value) {
          return null;
        }

        try {
          return JSON.parse(value) as VideoTranscriptHeartbeatPayload;
        } catch {
          return null;
        }
      })
      .filter((node): node is VideoTranscriptHeartbeatPayload => node !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return nodes;
  }

  private async reportHeartbeat(): Promise<void> {
    const payload: VideoTranscriptHeartbeatPayload = {
      nodeId: this.getNodeId(),
      hostname: os.hostname(),
      pid: process.pid,
      cpuLoad1: os.loadavg()[0] ?? 0,
      memoryTotal: os.totalmem(),
      memoryFree: os.freemem(),
      processRss: process.memoryUsage().rss,
      activeTasks: this.activeTasks,
      updatedAt: new Date().toISOString(),
    };

    await this.redisService.set(
      buildVideoTranscriptHeartbeatKey(payload.nodeId),
      JSON.stringify(payload),
      VIDEO_TRANSCRIPT_HEARTBEAT_TTL_SECONDS,
    );
  }

  private getNodeId(): string {
    const configured = this.configService.get<string>(
      VIDEO_TRANSCRIPT_LOCAL_WORKER_NODE_ID_ENV,
      '',
    );
    return configured?.trim() || os.hostname();
  }

  private isLocalWorkerEnabled(): boolean {
    return parseBooleanEnv(
      this.configService.get<string>('VIDEO_TRANSCRIPT_ENABLE_LOCAL_WORKER'),
      false,
    );
  }
}
