/**
 * [PROVIDES]: Redis client, cache operations, distributed locks, rate limiting, concurrency control
 * [DEPENDS]: REDIS_URL environment variable, ioredis
 * [POS]: Redis access layer - caching, locking, rate limiting, and concurrency management
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/server/CLAUDE.md
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// 缓存 Key 前缀
const CACHE_PREFIX = {
  CACHE: 'cache:',         // 通用缓存
  LOCK: 'lock:',           // 分布式锁
  RATE_LIMIT: 'rl:',       // 频率限制
  CONCURRENT: 'cc:',       // 并发计数
} as const;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://localhost:6379',
    );
    this.redis = new Redis(redisUrl);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  get client(): Redis {
    return this.redis;
  }

  // ==================== 基础操作 ====================

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async incrby(key: string, value: number): Promise<number> {
    return this.redis.incrby(key, value);
  }

  async decr(key: string): Promise<number> {
    return this.redis.decr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  /**
   * Set if not exists, with TTL
   * @returns true if key was set, false if key already exists
   */
  async setnx(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (ttlSeconds) {
      const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } else {
      const result = await this.redis.setnx(key, value);
      return result === 1;
    }
  }

  // ==================== 通用缓存 ====================

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值或 null
   */
  async getCache(key: string): Promise<string | null> {
    return this.redis.get(`${CACHE_PREFIX.CACHE}${key}`);
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttlSeconds 缓存时间（秒）
   */
  async setCache(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.setex(`${CACHE_PREFIX.CACHE}${key}`, ttlSeconds, value);
  }

  /**
   * 删除缓存
   */
  async delCache(key: string): Promise<void> {
    await this.redis.del(`${CACHE_PREFIX.CACHE}${key}`);
  }

  // ==================== 分布式锁 ====================

  /**
   * 尝试获取锁
   * @param lockKey 锁键
   * @param value 锁值（用于释放时验证）
   * @param ttlSeconds 锁超时时间
   * @returns 是否成功获取锁
   */
  async tryAcquireLock(
    lockKey: string,
    value: string,
    ttlSeconds: number = 120,
  ): Promise<boolean> {
    const key = `${CACHE_PREFIX.LOCK}${lockKey}`;
    return this.setnx(key, value, ttlSeconds);
  }

  /**
   * 释放锁
   */
  async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(`${CACHE_PREFIX.LOCK}${lockKey}`);
  }

  // ==================== 并发计数 ====================

  /**
   * 增加用户并发计数
   * @returns 当前并发数
   */
  async incrementConcurrent(userId: string, ttlSeconds: number = 120): Promise<number> {
    const key = `${CACHE_PREFIX.CONCURRENT}${userId}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    return count;
  }

  /**
   * 减少用户并发计数
   */
  async decrementConcurrent(userId: string): Promise<number> {
    const key = `${CACHE_PREFIX.CONCURRENT}${userId}`;
    const count = await this.redis.decr(key);
    if (count <= 0) {
      await this.redis.del(key);
      return 0;
    }
    return count;
  }

  /**
   * 获取用户当前并发数
   */
  async getConcurrent(userId: string): Promise<number> {
    const count = await this.redis.get(`${CACHE_PREFIX.CONCURRENT}${userId}`);
    return count ? parseInt(count, 10) : 0;
  }

  // ==================== 频率限制 ====================

  /**
   * 检查并增加频率计数
   * @param userId 用户 ID
   * @param windowSeconds 时间窗口（秒）
   * @param limit 限制次数
   * @returns { allowed: boolean, current: number, remaining: number }
   */
  async checkRateLimit(
    userId: string,
    windowSeconds: number,
    limit: number,
  ): Promise<{ allowed: boolean; current: number; remaining: number }> {
    const key = `${CACHE_PREFIX.RATE_LIMIT}${userId}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    return {
      allowed: current <= limit,
      current,
      remaining: Math.max(0, limit - current),
    };
  }

  // ==================== 健康检查 ====================

  /**
   * Health check - verify Redis connection
   */
  async ping(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
