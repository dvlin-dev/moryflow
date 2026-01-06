/**
 * RedisService 单元测试
 * 测试 Redis 操作封装
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisService } from '../redis.service';
import type { ConfigService } from '@nestjs/config';

// Mock Redis methods
const mockRedisMethods = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  incrby: vi.fn(),
  decr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  setnx: vi.fn(),
  ping: vi.fn(),
  quit: vi.fn(),
};

// Mock ioredis 使用 class
vi.mock('ioredis', () => {
  // 必须使用 function 关键字，不能用箭头函数
  const MockRedis = function MockRedis() {
    return mockRedisMethods;
  };
  return { default: MockRedis };
});

describe('RedisService', () => {
  let service: RedisService;
  let mockConfig: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      get: vi.fn().mockReturnValue('redis://localhost:6379'),
    };

    service = new RedisService(mockConfig as unknown as ConfigService);
  });

  // ============ 基础操作 ============

  describe('basic operations', () => {
    describe('get', () => {
      it('should return value when key exists', async () => {
        mockRedisMethods.get.mockResolvedValue('test_value');

        const result = await service.get('test_key');

        expect(result).toBe('test_value');
        expect(mockRedisMethods.get).toHaveBeenCalledWith('test_key');
      });

      it('should return null when key not exists', async () => {
        mockRedisMethods.get.mockResolvedValue(null);

        const result = await service.get('non_existent');

        expect(result).toBeNull();
      });
    });

    describe('set', () => {
      it('should set value without TTL', async () => {
        await service.set('key', 'value');

        expect(mockRedisMethods.set).toHaveBeenCalledWith('key', 'value');
      });

      it('should set value with TTL', async () => {
        await service.set('key', 'value', 3600);

        expect(mockRedisMethods.setex).toHaveBeenCalledWith('key', 3600, 'value');
      });
    });

    describe('del', () => {
      it('should delete key', async () => {
        await service.del('key');

        expect(mockRedisMethods.del).toHaveBeenCalledWith('key');
      });
    });

    describe('incr', () => {
      it('should increment key', async () => {
        mockRedisMethods.incr.mockResolvedValue(5);

        const result = await service.incr('counter');

        expect(result).toBe(5);
        expect(mockRedisMethods.incr).toHaveBeenCalledWith('counter');
      });
    });

    describe('incrby', () => {
      it('should increment key by value', async () => {
        mockRedisMethods.incrby.mockResolvedValue(15);

        const result = await service.incrby('counter', 10);

        expect(result).toBe(15);
        expect(mockRedisMethods.incrby).toHaveBeenCalledWith('counter', 10);
      });
    });

    describe('decr', () => {
      it('should decrement key', async () => {
        mockRedisMethods.decr.mockResolvedValue(3);

        const result = await service.decr('counter');

        expect(result).toBe(3);
        expect(mockRedisMethods.decr).toHaveBeenCalledWith('counter');
      });
    });

    describe('expire', () => {
      it('should set expiration', async () => {
        await service.expire('key', 3600);

        expect(mockRedisMethods.expire).toHaveBeenCalledWith('key', 3600);
      });
    });

    describe('ttl', () => {
      it('should return TTL', async () => {
        mockRedisMethods.ttl.mockResolvedValue(1800);

        const result = await service.ttl('key');

        expect(result).toBe(1800);
      });
    });

    describe('setnx', () => {
      it('should return true when key set', async () => {
        mockRedisMethods.set.mockResolvedValue('OK');

        const result = await service.setnx('new_key', 'value', 3600);

        expect(result).toBe(true);
        expect(mockRedisMethods.set).toHaveBeenCalledWith('new_key', 'value', 'EX', 3600, 'NX');
      });

      it('should return false when key exists', async () => {
        mockRedisMethods.set.mockResolvedValue(null);

        const result = await service.setnx('existing_key', 'value', 3600);

        expect(result).toBe(false);
      });

      it('should work without TTL', async () => {
        mockRedisMethods.setnx.mockResolvedValue(1);

        const result = await service.setnx('key', 'value');

        expect(result).toBe(true);
        expect(mockRedisMethods.setnx).toHaveBeenCalledWith('key', 'value');
      });
    });
  });

  // ============ 截图缓存 ============

  describe('screenshot cache', () => {
    describe('getScreenshotCache', () => {
      it('should return cached screenshot id', async () => {
        mockRedisMethods.get.mockResolvedValue('screenshot_123');

        const result = await service.getScreenshotCache('hash_abc');

        expect(result).toBe('screenshot_123');
        expect(mockRedisMethods.get).toHaveBeenCalledWith('ss:cache:hash_abc');
      });

      it('should return null when not cached', async () => {
        mockRedisMethods.get.mockResolvedValue(null);

        const result = await service.getScreenshotCache('hash_xyz');

        expect(result).toBeNull();
      });
    });

    describe('setScreenshotCache', () => {
      it('should cache screenshot id with TTL', async () => {
        await service.setScreenshotCache('hash_abc', 'screenshot_123', 3600);

        expect(mockRedisMethods.setex).toHaveBeenCalledWith(
          'ss:cache:hash_abc',
          3600,
          'screenshot_123',
        );
      });
    });
  });

  // ============ 并发控制 ============

  describe('processing lock', () => {
    describe('tryAcquireProcessingLock', () => {
      it('should return null when lock acquired', async () => {
        mockRedisMethods.set.mockResolvedValue('OK');

        const result = await service.tryAcquireProcessingLock(
          'hash_abc',
          'screenshot_123',
          120,
        );

        expect(result).toBeNull();
        expect(mockRedisMethods.set).toHaveBeenCalledWith(
          'ss:proc:hash_abc',
          'screenshot_123',
          'EX',
          120,
          'NX',
        );
      });

      it('should return existing screenshot id when lock not acquired', async () => {
        mockRedisMethods.set.mockResolvedValue(null);
        mockRedisMethods.get.mockResolvedValue('existing_screenshot');

        const result = await service.tryAcquireProcessingLock(
          'hash_abc',
          'screenshot_123',
          120,
        );

        expect(result).toBe('existing_screenshot');
      });

      it('should use default TTL of 120 seconds', async () => {
        mockRedisMethods.set.mockResolvedValue('OK');

        await service.tryAcquireProcessingLock('hash_abc', 'screenshot_123');

        expect(mockRedisMethods.set).toHaveBeenCalledWith(
          'ss:proc:hash_abc',
          'screenshot_123',
          'EX',
          120,
          'NX',
        );
      });
    });

    describe('releaseProcessingLock', () => {
      it('should release lock', async () => {
        await service.releaseProcessingLock('hash_abc');

        expect(mockRedisMethods.del).toHaveBeenCalledWith('ss:proc:hash_abc');
      });
    });
  });

  // ============ 并发计数 ============

  describe('concurrent counting', () => {
    describe('incrementConcurrent', () => {
      it('should increment and return count', async () => {
        mockRedisMethods.incr.mockResolvedValue(3);

        const result = await service.incrementConcurrent('user_1', 120);

        expect(result).toBe(3);
        expect(mockRedisMethods.incr).toHaveBeenCalledWith('cc:user_1');
      });

      it('should set expiration on first increment', async () => {
        mockRedisMethods.incr.mockResolvedValue(1);

        await service.incrementConcurrent('user_1', 120);

        expect(mockRedisMethods.expire).toHaveBeenCalledWith('cc:user_1', 120);
      });

      it('should not set expiration on subsequent increments', async () => {
        mockRedisMethods.incr.mockResolvedValue(2);

        await service.incrementConcurrent('user_1', 120);

        expect(mockRedisMethods.expire).not.toHaveBeenCalled();
      });
    });

    describe('decrementConcurrent', () => {
      it('should decrement and return count', async () => {
        mockRedisMethods.decr.mockResolvedValue(2);

        const result = await service.decrementConcurrent('user_1');

        expect(result).toBe(2);
        expect(mockRedisMethods.decr).toHaveBeenCalledWith('cc:user_1');
      });

      it('should delete key when count reaches 0', async () => {
        mockRedisMethods.decr.mockResolvedValue(0);

        const result = await service.decrementConcurrent('user_1');

        expect(result).toBe(0);
        expect(mockRedisMethods.del).toHaveBeenCalledWith('cc:user_1');
      });

      it('should delete key when count goes negative', async () => {
        mockRedisMethods.decr.mockResolvedValue(-1);

        const result = await service.decrementConcurrent('user_1');

        expect(result).toBe(0);
        expect(mockRedisMethods.del).toHaveBeenCalledWith('cc:user_1');
      });
    });

    describe('getConcurrent', () => {
      it('should return current count', async () => {
        mockRedisMethods.get.mockResolvedValue('5');

        const result = await service.getConcurrent('user_1');

        expect(result).toBe(5);
        expect(mockRedisMethods.get).toHaveBeenCalledWith('cc:user_1');
      });

      it('should return 0 when key not exists', async () => {
        mockRedisMethods.get.mockResolvedValue(null);

        const result = await service.getConcurrent('user_1');

        expect(result).toBe(0);
      });
    });
  });

  // ============ 频率限制 ============

  describe('rate limiting', () => {
    describe('checkRateLimit', () => {
      it('should allow when under limit', async () => {
        mockRedisMethods.incr.mockResolvedValue(5);

        const result = await service.checkRateLimit('user_1', 60, 10);

        expect(result).toEqual({
          allowed: true,
          current: 5,
          remaining: 5,
        });
      });

      it('should deny when at limit', async () => {
        mockRedisMethods.incr.mockResolvedValue(10);

        const result = await service.checkRateLimit('user_1', 60, 10);

        expect(result).toEqual({
          allowed: true,
          current: 10,
          remaining: 0,
        });
      });

      it('should deny when over limit', async () => {
        mockRedisMethods.incr.mockResolvedValue(11);

        const result = await service.checkRateLimit('user_1', 60, 10);

        expect(result).toEqual({
          allowed: false,
          current: 11,
          remaining: 0,
        });
      });

      it('should set expiration on first request', async () => {
        mockRedisMethods.incr.mockResolvedValue(1);

        await service.checkRateLimit('user_1', 60, 10);

        expect(mockRedisMethods.expire).toHaveBeenCalledWith(
          expect.stringMatching(/^rl:user_1:\d+$/),
          60,
        );
      });

      it('should not set expiration on subsequent requests', async () => {
        mockRedisMethods.incr.mockResolvedValue(2);

        await service.checkRateLimit('user_1', 60, 10);

        expect(mockRedisMethods.expire).not.toHaveBeenCalled();
      });
    });
  });

  // ============ 健康检查 ============

  describe('health check', () => {
    describe('ping', () => {
      it('should return true when Redis responds', async () => {
        mockRedisMethods.ping.mockResolvedValue('PONG');

        const result = await service.ping();

        expect(result).toBe(true);
      });

      it('should return false on error', async () => {
        mockRedisMethods.ping.mockRejectedValue(new Error('Connection failed'));

        const result = await service.ping();

        expect(result).toBe(false);
      });
    });
  });

  // ============ 生命周期 ============

  describe('lifecycle', () => {
    describe('onModuleDestroy', () => {
      it('should quit redis connection', async () => {
        await service.onModuleDestroy();

        expect(mockRedisMethods.quit).toHaveBeenCalled();
      });
    });

    describe('client getter', () => {
      it('should return redis client', () => {
        const client = service.client;

        expect(client).toBe(mockRedisMethods);
      });
    });
  });
});
