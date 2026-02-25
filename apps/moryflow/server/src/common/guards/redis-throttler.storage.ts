/**
 * [INPUT]: Throttler key + ttl/limit/blockDuration
 * [OUTPUT]: ThrottlerStorageRecord（totalHits/timeToExpire/isBlocked）
 * [POS]: 全局限流 Redis 存储实现（多实例共享计数）
 */

import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '../../redis';

const THROTTLE_KEY_PREFIX = 'throttle';
const REDIS_THROTTLE_EVAL_KEYS_COUNT = 2;

const REDIS_THROTTLE_LUA = `
local counterKey = KEYS[1]
local blockedKey = KEYS[2]

local ttlMs = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDurationMs = tonumber(ARGV[3])

local blockedTtlMs = redis.call('PTTL', blockedKey)
if blockedTtlMs > 0 then
  local totalHits = tonumber(redis.call('GET', counterKey) or '0')
  local counterTtlMs = redis.call('PTTL', counterKey)
  if counterTtlMs <= 0 then
    redis.call('PEXPIRE', counterKey, ttlMs)
    counterTtlMs = ttlMs
  end

  return { totalHits, counterTtlMs, 1, blockedTtlMs }
end

local totalHits = tonumber(redis.call('INCR', counterKey))
local counterTtlMs = redis.call('PTTL', counterKey)
if counterTtlMs <= 0 then
  redis.call('PEXPIRE', counterKey, ttlMs)
  counterTtlMs = ttlMs
end

if totalHits > limit then
  redis.call('SET', blockedKey, '1', 'PX', blockDurationMs)
  local blockTtlMs = redis.call('PTTL', blockedKey)
  return { totalHits, counterTtlMs, 1, blockTtlMs }
end

return { totalHits, counterTtlMs, 0, 0 }
`;

const toSeconds = (ms: number): number => Math.max(0, Math.ceil(ms / 1000));

const resolvePositiveMs = (value: number, fallback: number): number => {
  if (Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return fallback;
};

const resolvePositiveInt = (value: number, fallback: number): number => {
  if (Number.isFinite(value) && value >= 1) {
    return Math.floor(value);
  }
  return fallback;
};

type ThrottleEvalResult = [number, number, number, number];

const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

@Injectable()
export class RedisThrottlerStorageService implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const ttlMs = resolvePositiveMs(ttl, 1_000);
    const limitValue = resolvePositiveInt(limit, 1);
    const blockDurationMs = resolvePositiveMs(blockDuration, ttlMs);
    const counterKey = `${THROTTLE_KEY_PREFIX}:${throttlerName}:${key}`;
    const blockedKey = `${counterKey}:blocked`;
    const client = this.redis.client;
    const raw = await client.eval(
      REDIS_THROTTLE_LUA,
      REDIS_THROTTLE_EVAL_KEYS_COUNT,
      counterKey,
      blockedKey,
      ttlMs,
      limitValue,
      blockDurationMs,
    );
    const [
      totalHitsRaw,
      timeToExpireMsRaw,
      isBlockedRaw,
      timeToBlockExpireMsRaw,
    ] = Array.isArray(raw) ? (raw as ThrottleEvalResult) : [0, ttlMs, 0, 0];

    const totalHits = Math.max(0, toNumber(totalHitsRaw, 0));
    const timeToExpireMs = resolvePositiveMs(
      toNumber(timeToExpireMsRaw, ttlMs),
      ttlMs,
    );
    const isBlocked = toNumber(isBlockedRaw, 0) === 1;
    const timeToBlockExpireMs = isBlocked
      ? resolvePositiveMs(
          toNumber(timeToBlockExpireMsRaw, blockDurationMs),
          blockDurationMs,
        )
      : 0;

    return {
      totalHits,
      timeToExpire: toSeconds(timeToExpireMs),
      isBlocked,
      timeToBlockExpire: toSeconds(timeToBlockExpireMs),
    };
  }
}
