import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const COMPARE_AND_DELETE_LUA = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
`;

const COMPARE_AND_EXPIRE_LUA = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('expire', KEYS[1], ARGV[2])
end
return 0
`;

const INCREMENT_WITH_EXPIRE_LUA = `
local count = redis.call('incr', KEYS[1])
if count == 1 then
  redis.call('expire', KEYS[1], ARGV[1])
end
return count
`;

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

  async incrementWithExpire(key: string, ttlSeconds: number): Promise<number> {
    const result = await this.redis.eval(
      INCREMENT_WITH_EXPIRE_LUA,
      1,
      key,
      String(ttlSeconds),
    );
    return typeof result === 'number' ? result : Number(result);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  async compareAndDelete(key: string, expectedValue: string): Promise<boolean> {
    const result = await this.redis.eval(
      COMPARE_AND_DELETE_LUA,
      1,
      key,
      expectedValue,
    );
    return result === 1;
  }

  async compareAndExpire(
    key: string,
    expectedValue: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.redis.eval(
      COMPARE_AND_EXPIRE_LUA,
      1,
      key,
      expectedValue,
      String(ttlSeconds),
    );
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  /**
   * Set if not exists (用于分布式锁)
   * @returns true if key was set, false if key already exists
   */
  async setnx(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<boolean> {
    if (ttlSeconds) {
      // SET key value NX EX ttl - 原子操作
      const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    }
    const result = await this.redis.setnx(key, value);
    return result === 1;
  }

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
