/**
 * Agent Task Progress Store
 *
 * [INPUT]: Agent 任务进度与取消请求
 * [OUTPUT]: Redis 读写（进度快照、取消标记）
 * [POS]: Agent 任务运行态存储（跨实例协作）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import type { AgentTaskProgress } from './dto';

interface AgentProgressSnapshot extends AgentTaskProgress {
  updatedAt: string;
}

const AGENT_PROGRESS_PREFIX = 'agent:progress:';
const AGENT_CANCEL_PREFIX = 'agent:cancel:';
const AGENT_PROGRESS_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class AgentTaskProgressStore {
  constructor(private readonly redis: RedisService) {}

  async setProgress(taskId: string, progress: AgentTaskProgress): Promise<void> {
    const snapshot: AgentProgressSnapshot = {
      ...progress,
      updatedAt: new Date().toISOString(),
    };
    await this.redis.set(
      `${AGENT_PROGRESS_PREFIX}${taskId}`,
      JSON.stringify(snapshot),
      AGENT_PROGRESS_TTL_SECONDS
    );
  }

  async getProgress(taskId: string): Promise<AgentTaskProgress | null> {
    const raw = await this.redis.get(`${AGENT_PROGRESS_PREFIX}${taskId}`);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AgentProgressSnapshot;
      return {
        creditsUsed: parsed.creditsUsed,
        toolCallCount: parsed.toolCallCount,
        elapsedMs: parsed.elapsedMs,
      };
    } catch {
      return null;
    }
  }

  async clearProgress(taskId: string): Promise<void> {
    await this.redis.del(`${AGENT_PROGRESS_PREFIX}${taskId}`);
  }

  async requestCancel(taskId: string): Promise<void> {
    await this.redis.set(`${AGENT_CANCEL_PREFIX}${taskId}`, '1', AGENT_PROGRESS_TTL_SECONDS);
  }

  async isCancelRequested(taskId: string): Promise<boolean> {
    const value = await this.redis.get(`${AGENT_CANCEL_PREFIX}${taskId}`);
    return value !== null;
  }

  async clearCancel(taskId: string): Promise<void> {
    await this.redis.del(`${AGENT_CANCEL_PREFIX}${taskId}`);
  }
}
