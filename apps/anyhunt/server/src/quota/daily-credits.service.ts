/**
 * [INPUT]: userId, dailyLimit, amount, now?
 * [OUTPUT]: daily credits status / consume / refund results
 * [POS]: quota 模块的 daily credits 账本（Redis），按 UTC 天隔离 key
 *        refund 支持 referenceId 幂等
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { getNextUtcMidnight, getUtcDateKey } from './daily-credits.utils';

const DAILY_USED_KEY_PREFIX = 'credits:daily_used:' as const;
const DAILY_REFUND_KEY_PREFIX = 'credits:daily_refund:' as const;
/** Redis key 保留天数（用于清理历史 key） */
const DAILY_CREDITS_RETENTION_DAYS = 7;

export interface DailyCreditsStatus {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: Date;
}

export interface DailyCreditsConsumeResult {
  consumed: number;
  balanceBefore: number;
  balanceAfter: number;
  resetsAt: Date;
}

export interface DailyCreditsRefundResult {
  refunded: number;
  balanceBefore: number;
  balanceAfter: number;
  resetsAt: Date;
}

export interface DailyCreditsRefundOnceResult extends DailyCreditsRefundResult {
  duplicated: boolean;
}

/**
 * 说明：
 * - key 采用 YYYY-MM-DD 分区（UTC），所以“重置”依赖 key 变更而不是 TTL 到午夜
 * - TTL 仅用于自动清理历史 key（默认 7 天）
 */
@Injectable()
export class DailyCreditsService {
  constructor(private readonly redis: RedisService) {}

  private getKey(userId: string, date: Date): string {
    return `${DAILY_USED_KEY_PREFIX}${userId}:${getUtcDateKey(date)}`;
  }

  private getRefundKey(userId: string, referenceId: string): string {
    return `${DAILY_REFUND_KEY_PREFIX}${userId}:${referenceId}`;
  }

  private getRetentionSeconds(): number {
    return DAILY_CREDITS_RETENTION_DAYS * 24 * 60 * 60;
  }

  private getResetsAt(now: Date): Date {
    return getNextUtcMidnight(now);
  }

  async getStatus(
    userId: string,
    dailyLimit: number,
    now: Date = new Date(),
  ): Promise<DailyCreditsStatus> {
    const limit = Math.max(0, Math.floor(dailyLimit));
    const resetsAt = this.getResetsAt(now);

    if (limit <= 0) {
      return { limit: 0, used: 0, remaining: 0, resetsAt };
    }

    const usedRaw = await this.redis.get(this.getKey(userId, now));
    const used = Math.max(
      0,
      Math.min(limit, parseInt(usedRaw ?? '0', 10) || 0),
    );
    return { limit, used, remaining: limit - used, resetsAt };
  }

  async consume(
    userId: string,
    dailyLimit: number,
    amount: number,
    now: Date = new Date(),
  ): Promise<DailyCreditsConsumeResult> {
    const limit = Math.max(0, Math.floor(dailyLimit));
    const wanted = Math.max(0, Math.floor(amount));
    const resetsAt = this.getResetsAt(now);

    if (limit <= 0 || wanted <= 0) {
      return {
        consumed: 0,
        balanceBefore: limit,
        balanceAfter: limit,
        resetsAt,
      };
    }

    const key = this.getKey(userId, now);
    const retentionSeconds = this.getRetentionSeconds();

    // KEYS[1] = usedKey
    // ARGV[1] = limit
    // ARGV[2] = amount
    // ARGV[3] = retentionSeconds
    const lua = `
      local used = tonumber(redis.call('GET', KEYS[1]) or '0')
      local limit = tonumber(ARGV[1])
      local amount = tonumber(ARGV[2])
      local retention = tonumber(ARGV[3])

      if limit <= 0 or amount <= 0 then
        return {0, used}
      end

      local remaining = limit - used
      if remaining <= 0 then
        if redis.call('TTL', KEYS[1]) < 0 then
          redis.call('EXPIRE', KEYS[1], retention)
        end
        return {0, used}
      end

      local consume = amount
      if consume > remaining then consume = remaining end
      local newUsed = used + consume
      redis.call('SET', KEYS[1], tostring(newUsed), 'EX', retention)
      return {consume, newUsed}
    `;

    const result = (await this.redis.client.eval(
      lua,
      1,
      key,
      limit,
      wanted,
      retentionSeconds,
    )) as [number, number];

    const consumed = Math.max(0, Math.min(wanted, result?.[0] ?? 0));
    const usedAfter = Math.max(0, Math.min(limit, result?.[1] ?? 0));
    const balanceAfter = limit - usedAfter;
    const balanceBefore = balanceAfter + consumed;

    return { consumed, balanceBefore, balanceAfter, resetsAt };
  }

  async refund(
    userId: string,
    dailyLimit: number,
    amount: number,
    referenceDate: Date,
    now: Date = new Date(),
  ): Promise<DailyCreditsRefundResult> {
    const limit = Math.max(0, Math.floor(dailyLimit));
    const wanted = Math.max(0, Math.floor(amount));
    const resetsAt = this.getResetsAt(now);

    if (limit <= 0 || wanted <= 0) {
      return {
        refunded: 0,
        balanceBefore: limit,
        balanceAfter: limit,
        resetsAt,
      };
    }

    const key = this.getKey(userId, referenceDate);
    const retentionSeconds = this.getRetentionSeconds();

    // KEYS[1] = usedKey
    // ARGV[1] = amount
    // ARGV[2] = retentionSeconds
    const lua = `
      local used = tonumber(redis.call('GET', KEYS[1]) or '0')
      local amount = tonumber(ARGV[1])
      local retention = tonumber(ARGV[2])

      if amount <= 0 then
        return {0, used}
      end

      if used <= 0 then
        if redis.call('TTL', KEYS[1]) < 0 then
          redis.call('EXPIRE', KEYS[1], retention)
        end
        return {0, used}
      end

      local refunded = amount
      if refunded > used then refunded = used end
      local newUsed = used - refunded
      redis.call('SET', KEYS[1], tostring(newUsed), 'EX', retention)
      return {refunded, newUsed}
    `;

    const result = (await this.redis.client.eval(
      lua,
      1,
      key,
      wanted,
      retentionSeconds,
    )) as [number, number];

    const refunded = Math.max(0, Math.min(wanted, result?.[0] ?? 0));
    const usedAfter = Math.max(0, Math.min(limit, result?.[1] ?? 0));
    const balanceAfter = limit - usedAfter;
    const balanceBefore = Math.max(0, Math.min(limit, balanceAfter - refunded));

    return { refunded, balanceBefore, balanceAfter, resetsAt };
  }

  async refundOnce(
    userId: string,
    dailyLimit: number,
    amount: number,
    referenceDate: Date,
    referenceId: string,
    now: Date = new Date(),
  ): Promise<DailyCreditsRefundOnceResult> {
    const limit = Math.max(0, Math.floor(dailyLimit));
    const wanted = Math.max(0, Math.floor(amount));
    const resetsAt = this.getResetsAt(now);

    if (limit <= 0 || wanted <= 0) {
      return {
        refunded: 0,
        balanceBefore: limit,
        balanceAfter: limit,
        resetsAt,
        duplicated: false,
      };
    }

    const usedKey = this.getKey(userId, referenceDate);
    const refundKey = this.getRefundKey(userId, referenceId);
    const retentionSeconds = this.getRetentionSeconds();

    // KEYS[1] = usedKey
    // KEYS[2] = refundKey
    // ARGV[1] = amount
    // ARGV[2] = retentionSeconds
    const lua = `
      local used = tonumber(redis.call('GET', KEYS[1]) or '0')
      local amount = tonumber(ARGV[1])
      local retention = tonumber(ARGV[2])

      if redis.call('EXISTS', KEYS[2]) == 1 then
        return {0, used, 1}
      end

      if amount <= 0 then
        return {0, used, 0}
      end

      local refunded = amount
      if refunded > used then refunded = used end
      local newUsed = used - refunded
      redis.call('SET', KEYS[1], tostring(newUsed), 'EX', retention)
      redis.call('SET', KEYS[2], '1', 'EX', retention)
      return {refunded, newUsed, 0}
    `;

    const result = (await this.redis.client.eval(
      lua,
      2,
      usedKey,
      refundKey,
      wanted,
      retentionSeconds,
    )) as [number, number, number];

    const refunded = Math.max(0, Math.min(wanted, result?.[0] ?? 0));
    const usedAfter = Math.max(0, Math.min(limit, result?.[1] ?? 0));
    const duplicated = (result?.[2] ?? 0) === 1;

    const balanceAfter = limit - usedAfter;
    const balanceBefore = Math.max(0, Math.min(limit, balanceAfter - refunded));

    return { refunded, balanceBefore, balanceAfter, resetsAt, duplicated };
  }
}
