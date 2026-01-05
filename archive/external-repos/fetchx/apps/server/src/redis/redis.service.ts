import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// 缓存 Key 前缀
const CACHE_PREFIX = {
  SCREENSHOT: 'ss:cache:', // requestHash -> screenshotId
  PROCESSING: 'ss:proc:',  // 正在处理中的任务
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

  // ==================== 截图缓存 ====================

  /**
   * 获取截图缓存
   * @param requestHash 请求哈希
   * @returns screenshotId 或 null
   */
  async getScreenshotCache(requestHash: string): Promise<string | null> {
    return this.redis.get(`${CACHE_PREFIX.SCREENSHOT}${requestHash}`);
  }

  /**
   * 设置截图缓存
   * @param requestHash 请求哈希
   * @param screenshotId 截图 ID
   * @param ttlSeconds 缓存时间（秒）
   */
  async setScreenshotCache(
    requestHash: string,
    screenshotId: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.setex(
      `${CACHE_PREFIX.SCREENSHOT}${requestHash}`,
      ttlSeconds,
      screenshotId,
    );
  }

  // ==================== 并发控制 ====================

  /**
   * 尝试获取处理锁
   * @param requestHash 请求哈希
   * @param screenshotId 截图 ID（正在处理的任务）
   * @param ttlSeconds 锁超时时间
   * @returns 如果获取成功返回 null，否则返回正在处理的 screenshotId
   */
  async tryAcquireProcessingLock(
    requestHash: string,
    screenshotId: string,
    ttlSeconds: number = 120,
  ): Promise<string | null> {
    const key = `${CACHE_PREFIX.PROCESSING}${requestHash}`;
    const acquired = await this.setnx(key, screenshotId, ttlSeconds);
    if (acquired) {
      return null; // 成功获取锁
    }
    // 返回正在处理的 screenshotId
    return this.redis.get(key);
  }

  /**
   * 释放处理锁
   */
  async releaseProcessingLock(requestHash: string): Promise<void> {
    await this.redis.del(`${CACHE_PREFIX.PROCESSING}${requestHash}`);
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
