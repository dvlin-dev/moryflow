/**
 * Queue Utils 单元测试
 *
 * 测试队列工具函数：
 * - createQueueEvents 函数
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 使用 vi.hoisted 确保变量在 mock 之前被定义
const captured = vi.hoisted(() => ({
  name: null as string | null,
  options: null as any,
}));

// Mock BullMQ
vi.mock('bullmq', () => ({
  QueueEvents: class MockQueueEvents {
    constructor(name: string, options: any) {
      captured.name = name;
      captured.options = options;
    }
    close = vi.fn();
  },
}));

describe('createQueueEvents', () => {
  let createQueueEvents: typeof import('../queue.utils').createQueueEvents;

  beforeEach(async () => {
    // 确保本测试文件的 mock 在被测模块加载前生效
    vi.resetModules();
    ({ createQueueEvents } = await import('../queue.utils'));

    vi.clearAllMocks();
    captured.name = null;
    captured.options = null;
  });

  it('should create QueueEvents with correct name and connection from ConfigService', () => {
    const mockConfigService = {
      get: vi.fn().mockReturnValue('redis://localhost:6379'),
    };

    createQueueEvents('test-queue', mockConfigService as any);

    expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_URL');
    expect(captured.name).toBe('test-queue');
    expect(captured.options).toEqual({
      connection: {
        host: 'localhost',
        port: 6379,
        password: undefined,
        username: undefined,
      },
    });
  });

  it('should parse Redis URL with password', () => {
    const mockConfigService = {
      get: vi.fn().mockReturnValue('redis://:secret@redis.example.com:6380'),
    };

    createQueueEvents('my-queue', mockConfigService as any);

    expect(captured.options).toEqual({
      connection: {
        host: 'redis.example.com',
        port: 6380,
        password: 'secret',
        username: undefined,
      },
    });
  });

  it('should parse Redis URL with username and db', () => {
    const mockConfigService = {
      get: vi
        .fn()
        .mockReturnValue('redis://user:secret@redis.example.com:6380/2'),
    };

    createQueueEvents('queue-db', mockConfigService as any);

    expect(captured.options).toEqual({
      connection: {
        host: 'redis.example.com',
        port: 6380,
        username: 'user',
        password: 'secret',
        db: 2,
      },
    });
  });

  it('should enable TLS for rediss scheme', () => {
    const mockConfigService = {
      get: vi.fn().mockReturnValue('rediss://:secret@redis.example.com:6380/1'),
    };

    createQueueEvents('queue-tls', mockConfigService as any);

    expect(captured.options).toEqual({
      connection: {
        host: 'redis.example.com',
        port: 6380,
        password: 'secret',
        username: undefined,
        db: 1,
        tls: {},
      },
    });
  });

  it('should use default Redis URL when not configured', () => {
    const mockConfigService = {
      get: vi.fn().mockReturnValue(undefined),
    };

    createQueueEvents('queue-name', mockConfigService as any);

    expect(captured.options).toEqual({
      connection: {
        host: 'localhost',
        port: 6379,
        password: undefined,
        username: undefined,
      },
    });
  });

  it('should handle Redis URL with default port', () => {
    const mockConfigService = {
      get: vi.fn().mockReturnValue('redis://localhost'),
    };

    createQueueEvents('test', mockConfigService as any);

    expect(captured.options.connection.port).toBe(6379);
  });

  it('should return QueueEvents instance with close method', () => {
    const mockConfigService = {
      get: vi.fn().mockReturnValue('redis://localhost:6379'),
    };

    const result = createQueueEvents('queue', mockConfigService as any);

    expect(result).toBeDefined();
    expect(typeof result.close).toBe('function');
  });
});
