import { describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { RedisThrottlerStorageService } from './redis-throttler.storage';
import type { RedisService } from '../../redis';

type MockRedisClient = {
  eval: ReturnType<typeof vi.fn>;
};

const createService = (client: MockRedisClient) =>
  new RedisThrottlerStorageService({
    client,
  } as unknown as RedisService);

const createStatefulRedisClient = (): MockRedisClient => {
  let count = 0;
  let blocked = false;

  return {
    eval: vi.fn(
      (
        _script: string,
        _keyCount: number,
        _counterKey: string,
        _blockedKey: string,
        ttlMs: number,
        limit: number,
        blockDurationMs: number,
      ) => {
        if (blocked) {
          return Promise.resolve([count, ttlMs, 1, blockDurationMs]);
        }

        count += 1;
        if (count > limit) {
          blocked = true;
          return Promise.resolve([count, ttlMs, 1, blockDurationMs]);
        }
        return Promise.resolve([count, ttlMs, 0, 0]);
      },
    ),
  };
};

describe('RedisThrottlerStorageService', () => {
  it('should initialize ttl on first hit', async () => {
    const client: MockRedisClient = {
      eval: vi.fn().mockResolvedValue([1, 60_000, 0, 0]),
    };
    const service = createService(client);

    const result = await service.increment(
      'key',
      60_000,
      300,
      60_000,
      'default',
    );
    expect(result).toEqual({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    expect(client.eval).toHaveBeenCalledTimes(1);
  });

  it('should block when over limit', async () => {
    const client: MockRedisClient = {
      eval: vi.fn().mockResolvedValue([301, 59_000, 1, 60_000]),
    };
    const service = createService(client);

    const result = await service.increment(
      'key',
      60_000,
      300,
      60_000,
      'default',
    );
    expect(result).toEqual({
      totalHits: 301,
      timeToExpire: 59,
      isBlocked: true,
      timeToBlockExpire: 60,
    });
  });

  it('should return blocked state without incrementing counter', async () => {
    const client: MockRedisClient = {
      eval: vi.fn().mockResolvedValue([25, 30_000, 1, 45_000]),
    };
    const service = createService(client);

    const result = await service.increment(
      'key',
      60_000,
      300,
      60_000,
      'default',
    );
    expect(result).toEqual({
      totalHits: 25,
      timeToExpire: 30,
      isBlocked: true,
      timeToBlockExpire: 45,
    });
  });

  it('should block on the 301st request when limit is 300', async () => {
    const client = createStatefulRedisClient();
    const service = createService(client);
    let blockedAt = 0;

    for (let i = 1; i <= 301; i += 1) {
      const result = await service.increment(
        'api-v1-user-me',
        60_000,
        300,
        60_000,
        'default',
      );

      if (result.isBlocked) {
        blockedAt = i;
        break;
      }
    }

    expect(blockedAt).toBe(301);
  });

  it('should fail open when redis eval throws', async () => {
    const loggerErrorSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const client: MockRedisClient = {
      eval: vi.fn().mockRejectedValue(new Error('redis unavailable')),
    };
    const service = createService(client);

    try {
      const result = await service.increment(
        'api-v1-user-me',
        60_000,
        300,
        60_000,
        'default',
      );

      expect(result).toEqual({
        totalHits: 0,
        timeToExpire: 60,
        isBlocked: false,
        timeToBlockExpire: 0,
      });
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    } finally {
      loggerErrorSpy.mockRestore();
    }
  });
});
