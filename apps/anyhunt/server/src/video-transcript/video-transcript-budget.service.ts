/**
 * [INPUT]: 音频时长（秒）与预算配置（daily limit / timezone / cost）
 * [OUTPUT]: 预算预占结果与当日预算快照
 * [POS]: Video Transcript Cloud Fallback 预算闸门服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import {
  VIDEO_TRANSCRIPT_CLOUD_BUDGET_TIMEZONE,
  VIDEO_TRANSCRIPT_CLOUD_COST_PER_AUDIO_SECOND_USD,
  VIDEO_TRANSCRIPT_CLOUD_DAILY_BUDGET_USD,
  buildVideoTranscriptBudgetKey,
} from './video-transcript.constants';
import type { VideoTranscriptBudgetReservation } from './video-transcript.types';

const BUDGET_RESERVE_LUA = `
local key = KEYS[1]
local add = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local current = tonumber(redis.call('GET', key) or '0')
local next = current + add

if next > limit then
  return {0, current, limit}
end

redis.call('SET', key, tostring(next), 'EX', ttl)
return {1, next, limit}
`;

@Injectable()
export class VideoTranscriptBudgetService {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  estimateCostUsd(durationSec: number): number {
    const unitPrice = this.getCostPerAudioSecondUsd();
    const safeDuration = Math.max(0, durationSec);
    return Number((safeDuration * unitPrice).toFixed(6));
  }

  async tryReserveCloudBudget(
    durationSec: number,
  ): Promise<VideoTranscriptBudgetReservation> {
    const timezone = this.getBudgetTimezone();
    const dayKey = this.getCurrentDayKey(timezone);
    const key = buildVideoTranscriptBudgetKey(dayKey);
    const estimatedCostUsd = this.estimateCostUsd(durationSec);
    const dailyBudgetUsd = this.getDailyBudgetUsd();

    if (estimatedCostUsd <= 0) {
      const usage = await this.getCurrentBudgetUsage();
      return {
        allowed: true,
        estimatedCostUsd,
        usageAfterReserveUsd: usage.usedUsd,
        dailyBudgetUsd,
        dayKey,
        timezone,
      };
    }

    const ttlSeconds = 3 * 24 * 60 * 60;
    const raw = await this.redisService.client.eval(
      BUDGET_RESERVE_LUA,
      1,
      key,
      String(estimatedCostUsd),
      String(dailyBudgetUsd),
      String(ttlSeconds),
    );

    const result = Array.isArray(raw) ? raw : [];
    const allowed = Number(result[0] ?? 0) === 1;
    const usageAfterReserveUsd = Number(result[1] ?? 0);

    return {
      allowed,
      estimatedCostUsd,
      usageAfterReserveUsd,
      dailyBudgetUsd,
      dayKey,
      timezone,
    };
  }

  async getCurrentBudgetUsage(): Promise<{
    dayKey: string;
    timezone: string;
    usedUsd: number;
    dailyBudgetUsd: number;
    remainingUsd: number;
  }> {
    const timezone = this.getBudgetTimezone();
    const dayKey = this.getCurrentDayKey(timezone);
    const key = buildVideoTranscriptBudgetKey(dayKey);
    const usedRaw = await this.redisService.get(key);
    const usedUsd = Number(usedRaw ?? 0);
    const dailyBudgetUsd = this.getDailyBudgetUsd();

    return {
      dayKey,
      timezone,
      usedUsd,
      dailyBudgetUsd,
      remainingUsd: Math.max(0, Number((dailyBudgetUsd - usedUsd).toFixed(6))),
    };
  }

  private getDailyBudgetUsd(): number {
    const value = Number(
      this.configService.get<string>(
        'VIDEO_TRANSCRIPT_CLOUD_DAILY_BUDGET_USD',
        String(VIDEO_TRANSCRIPT_CLOUD_DAILY_BUDGET_USD),
      ),
    );
    if (!Number.isFinite(value) || value < 0) {
      return VIDEO_TRANSCRIPT_CLOUD_DAILY_BUDGET_USD;
    }
    return value;
  }

  private getCostPerAudioSecondUsd(): number {
    const value = Number(
      this.configService.get<string>(
        'VIDEO_TRANSCRIPT_CLOUD_COST_PER_AUDIO_SECOND_USD',
        String(VIDEO_TRANSCRIPT_CLOUD_COST_PER_AUDIO_SECOND_USD),
      ),
    );
    if (!Number.isFinite(value) || value < 0) {
      return VIDEO_TRANSCRIPT_CLOUD_COST_PER_AUDIO_SECOND_USD;
    }
    return value;
  }

  private getBudgetTimezone(): string {
    const timezone = this.configService.get<string>(
      'VIDEO_TRANSCRIPT_CLOUD_BUDGET_TZ',
      VIDEO_TRANSCRIPT_CLOUD_BUDGET_TIMEZONE,
    );
    return timezone?.trim() || VIDEO_TRANSCRIPT_CLOUD_BUDGET_TIMEZONE;
  }

  private getCurrentDayKey(timezone: string): string {
    const date = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const month = parts.find((p) => p.type === 'month')?.value ?? '01';
    const day = parts.find((p) => p.type === 'day')?.value ?? '01';

    return `${year}-${month}-${day}`;
  }
}
