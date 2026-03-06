/**
 * [INPUT]: ConfigService / RedisService mocks
 * [OUTPUT]: 云端预算闸门小数精度保留断言
 * [POS]: Video Transcript 预算服务回归测试
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoTranscriptBudgetService } from '../video-transcript-budget.service';
import { buildVideoTranscriptBudgetKey } from '../video-transcript.constants';

describe('VideoTranscriptBudgetService', () => {
  let service: VideoTranscriptBudgetService;
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockRedisService: {
    client: { eval: ReturnType<typeof vi.fn> };
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T08:00:00.000Z'));

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          VIDEO_TRANSCRIPT_CLOUD_DAILY_BUDGET_USD: '20',
          VIDEO_TRANSCRIPT_CLOUD_COST_PER_AUDIO_SECOND_USD: '0.1',
          VIDEO_TRANSCRIPT_CLOUD_BUDGET_TZ: 'Asia/Shanghai',
        };
        return config[key] ?? defaultValue;
      }),
    };

    mockRedisService = {
      client: {
        eval: vi.fn().mockResolvedValue([1, '15.9', '20']),
      },
      get: vi.fn().mockResolvedValue('0'),
    };

    service = new VideoTranscriptBudgetService(
      mockConfigService as any,
      mockRedisService as any,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns decimal budget usage without Lua numeric truncation', async () => {
    const reservation = await service.tryReserveCloudBudget(159);

    const [lua] = mockRedisService.client.eval.mock.calls[0] ?? [];

    expect(lua).toContain('return {0, tostring(current), tostring(limit)}');
    expect(lua).toContain('return {1, tostring(next), tostring(limit)}');
    expect(reservation.allowed).toBe(true);
    expect(reservation.usageAfterReserveUsd).toBe(15.9);
    expect(reservation.dailyBudgetUsd).toBe(20);
    expect(reservation.dayKey).toBe('2026-03-06');
  });

  it('releases reserved budget using the reservation dayKey', async () => {
    const reservation = {
      allowed: true,
      estimatedCostUsd: 0.25,
      usageAfterReserveUsd: 1.5,
      dailyBudgetUsd: 20,
      dayKey: '2026-03-05',
      timezone: 'Asia/Shanghai',
    };

    await service.releaseCloudBudgetReservation(reservation);

    const [lua, keyCount, key, amount] =
      mockRedisService.client.eval.mock.calls[0] ?? [];

    expect(lua).toContain("redis.call('DEL', key)");
    expect(lua).toContain("redis.call('SET', key, tostring(next), 'EX', ttl)");
    expect(keyCount).toBe(1);
    expect(key).toBe(buildVideoTranscriptBudgetKey('2026-03-05'));
    expect(amount).toBe('0.25');
  });
});
