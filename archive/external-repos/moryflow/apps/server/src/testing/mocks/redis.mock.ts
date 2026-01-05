/**
 * Redis Service Mock
 * 使用内存存储实现 Redis Mock
 * 兼容 Vitest
 */

import { vi } from 'vitest';

/**
 * Redis Mock 类型
 */
export interface MockRedisService {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  incr: ReturnType<typeof vi.fn>;
  incrby: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
  ttl: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  keys: ReturnType<typeof vi.fn>;
  hget: ReturnType<typeof vi.fn>;
  hset: ReturnType<typeof vi.fn>;
  hdel: ReturnType<typeof vi.fn>;
  hgetall: ReturnType<typeof vi.fn>;
}

/**
 * 创建 Redis Service Mock
 */
export function createRedisMock(): MockRedisService {
  const store = new Map<string, string>();

  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: vi.fn((key: string) => {
      const had = store.has(key);
      store.delete(key);
      return Promise.resolve(had ? 1 : 0);
    }),
    incr: vi.fn((key: string) => {
      const current = parseInt(store.get(key) || '0', 10);
      store.set(key, String(current + 1));
      return Promise.resolve(current + 1);
    }),
    incrby: vi.fn((key: string, amount: number) => {
      const current = parseInt(store.get(key) || '0', 10);
      store.set(key, String(current + amount));
      return Promise.resolve(current + amount);
    }),
    expire: vi.fn(() => Promise.resolve(1)),
    ttl: vi.fn(() => Promise.resolve(-1)),
    exists: vi.fn((key: string) => Promise.resolve(store.has(key) ? 1 : 0)),
    keys: vi.fn((pattern: string) => {
      const regex = new RegExp(
        pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
      );
      return Promise.resolve([...store.keys()].filter((k) => regex.test(k)));
    }),
    hget: vi.fn(() => Promise.resolve(null)),
    hset: vi.fn(() => Promise.resolve(1)),
    hdel: vi.fn(() => Promise.resolve(0)),
    hgetall: vi.fn(() => Promise.resolve({})),
  };
}
