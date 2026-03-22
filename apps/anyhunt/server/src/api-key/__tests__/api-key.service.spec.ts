/**
 * ApiKeyService 单元测试
 * 测试 API Key hash-only 存储、CRUD 和验证逻辑
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ApiKeyService } from '../api-key.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { VectorPrismaService } from '../../vector-prisma/vector-prisma.service';
import type { RedisService } from '../../redis/redis.service';
import { API_KEY_PREFIX, IN_PROCESS_CACHE_TTL_MS } from '../api-key.constants';

type MockPrisma = {
  $transaction: Mock;
  apiKey: {
    create: Mock;
    findMany: Mock;
    findFirst: Mock;
    findUnique: Mock;
    update: Mock;
    delete: Mock;
  };
  apiKeyCleanupTask: {
    create: Mock;
  };
};

type MockVectorPrisma = {
  memoryFact: { deleteMany: Mock };
  memoryFactHistory: { deleteMany: Mock };
  memoryFactFeedback: { deleteMany: Mock };
  memoryFactExport: { deleteMany: Mock };
  scopeRegistry: { deleteMany: Mock };
};

type MockCleanupQueue = {
  add: Mock;
};

type MockRedis = {
  get: Mock;
  set: Mock;
  del: Mock;
};

const hashApiKey = (key: string): string =>
  createHash('sha256').update(key).digest('hex');

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let mockPrisma: MockPrisma;
  let mockVectorPrisma: MockVectorPrisma;
  let mockRedis: MockRedis;
  let mockCleanupQueue: MockCleanupQueue;

  const validApiKey = `${API_KEY_PREFIX}${'a'.repeat(64)}`;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (callback) => callback(mockPrisma)),
      apiKey: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      },
      apiKeyCleanupTask: {
        create: vi.fn().mockResolvedValue({
          id: 'cleanup-task-1',
          apiKeyId: 'key_1',
          userId: 'user_1',
          status: 'PENDING',
        }),
      },
    };

    mockVectorPrisma = {
      memoryFact: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      memoryFactHistory: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      memoryFactFeedback: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      memoryFactExport: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      scopeRegistry: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };

    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };

    mockCleanupQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    };

    service = new (ApiKeyService as any)(
      mockPrisma as unknown as PrismaService,
      mockRedis as unknown as RedisService,
      mockCleanupQueue,
    );
  });

  describe('create', () => {
    it('should return plainKey once and store only hash fields', async () => {
      mockPrisma.apiKey.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'key_1',
          name: data.name,
          keyPrefix: data.keyPrefix,
          keyTail: data.keyTail,
        }),
      );

      const result = await service.create('user_1', {
        name: 'Test Key',
        expiresAt: undefined,
      });

      expect(result.plainKey).toMatch(/^ah_[a-f0-9]{64}$/);
      expect(result.keyPreview).toBe(`ah_****${result.plainKey.slice(-4)}`);
      expect(result.id).toBe('key_1');
      expect(result.name).toBe('Test Key');

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_1',
          name: 'Test Key',
          keyHash: hashApiKey(result.plainKey),
          keyPrefix: 'ah_',
          keyTail: result.plainKey.slice(-4),
        }),
      });

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({
          keyValue: expect.anything(),
        }),
      });
    });

    it('should handle expiresAt option', async () => {
      const expiresAt = new Date('2030-01-01');
      mockPrisma.apiKey.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'key_1',
          name: data.name,
          keyPrefix: data.keyPrefix,
          keyTail: data.keyTail,
          expiresAt: data.expiresAt,
        }),
      );

      await service.create('user_1', { name: 'Test Key', expiresAt });

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt,
        }),
      });
    });
  });

  describe('findAllByUser', () => {
    it('should return keyPreview instead of plaintext key', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'key_1',
          name: 'Key 1',
          keyPrefix: 'ah_',
          keyTail: '1111',
          isActive: true,
          lastUsedAt: null,
          expiresAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const result = await service.findAllByUser('user_1');

      expect(result).toEqual([
        {
          id: 'key_1',
          name: 'Key 1',
          keyPreview: 'ah_****1111',
          isActive: true,
          lastUsedAt: null,
          expiresAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        select: expect.any(Object),
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('update', () => {
    it('should update key and return keyPreview', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'key_1',
        keyHash: hashApiKey(validApiKey),
      });
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key_1',
        name: 'Updated Name',
        keyPrefix: 'ah_',
        keyTail: '9999',
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const result = await service.update('user_1', 'key_1', {
        name: 'Updated Name',
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'key_1',
          name: 'Updated Name',
          keyPreview: 'ah_****9999',
        }),
      );
    });

    it('should throw NotFoundException when key not found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user_1', 'nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should invalidate cache by keyHash when key is deactivated', async () => {
      const keyHash = hashApiKey(validApiKey);
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'key_1',
        keyHash,
      });
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key_1',
        name: 'Key 1',
        keyPrefix: 'ah_',
        keyTail: '1111',
        isActive: false,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await service.update('user_1', 'key_1', { isActive: false });

      expect(mockRedis.del).toHaveBeenCalledWith(`apikey:${keyHash}`);
    });
  });

  describe('delete', () => {
    it('should delete key in transaction, persist cleanup task, and enqueue durable cleanup job', async () => {
      const keyHash = hashApiKey(validApiKey);
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'key_1',
        userId: 'user_1',
        keyHash,
      });
      mockPrisma.apiKey.delete.mockResolvedValue({ id: 'key_1' });

      await service.delete('user_1', 'key_1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'key_1' },
      });
      expect(mockPrisma.apiKeyCleanupTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          apiKeyId: 'key_1',
          userId: 'user_1',
          status: 'PENDING',
        }),
      });
      expect(mockCleanupQueue.add).toHaveBeenCalledWith(
        'cleanup-api-key',
        expect.objectContaining({
          taskId: 'cleanup-task-1',
          apiKeyId: 'key_1',
        }),
        expect.objectContaining({
          jobId: 'memox-api-key-cleanup-cleanup-task-1',
        }),
      );
      expect(mockRedis.del).toHaveBeenCalledWith(`apikey:${keyHash}`);
      expect(mockVectorPrisma.memoryFact.deleteMany).not.toHaveBeenCalled();
      expect(
        mockVectorPrisma.memoryFactHistory.deleteMany,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when key not found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.delete('user_1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateKey', () => {
    it('should throw ForbiddenException for invalid format', async () => {
      await expect(service.validateKey('invalid_key')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.validateKey('')).rejects.toThrow(ForbiddenException);
      await expect(service.validateKey('sk_' + 'a'.repeat(64))).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should lookup by keyHash', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      await expect(service.validateKey(validApiKey)).rejects.toThrow(
        'Invalid API key',
      );

      expect(mockPrisma.apiKey.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { keyHash: hashApiKey(validApiKey) },
        }),
      );
    });

    it('should throw ForbiddenException for inactive key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key_1',
        isActive: false,
        user: { id: 'user_1', deletedAt: null },
      });

      await expect(service.validateKey(validApiKey)).rejects.toThrow(
        'inactive',
      );
    });

    it('should throw ForbiddenException for expired key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key_1',
        isActive: true,
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'user_1', deletedAt: null },
      });

      await expect(service.validateKey(validApiKey)).rejects.toThrow('expired');
    });

    it('should throw ForbiddenException for deleted user', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key_1',
        isActive: true,
        expiresAt: null,
        user: { id: 'user_1', deletedAt: new Date() },
      });

      await expect(service.validateKey(validApiKey)).rejects.toThrow('deleted');
    });

    it('should return validation result for valid key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key_1',
        userId: 'user_1',
        name: 'Test Key',
        isActive: true,
        expiresAt: null,
        user: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test User',
          deletedAt: null,
          isAdmin: false,
          subscription: { tier: 'PRO', status: 'ACTIVE' },
        },
      });

      const result = await service.validateKey(validApiKey);

      expect(result.userId).toBe('user_1');
      expect(result.user.subscriptionTier).toBe('PRO');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should use cache when available', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          id: 'key_1',
          userId: 'user_1',
          name: 'Cached Key',
          user: {
            id: 'user_1',
            email: 'cached@example.com',
            name: null,
            subscriptionTier: 'FREE',
            isAdmin: false,
          },
        }),
      );

      const result = await service.validateKey(validApiKey);

      expect(result.name).toBe('Cached Key');
      expect(mockPrisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('should reuse short-lived in-process validation cache between repeated validations', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          id: 'key_1',
          userId: 'user_1',
          name: 'Cached Key',
          user: {
            id: 'user_1',
            email: 'cached@example.com',
            name: null,
            subscriptionTier: 'FREE',
            isAdmin: false,
          },
        }),
      );

      const first = await service.validateKey(validApiKey);
      const second = await service.validateKey(validApiKey);

      expect(first.name).toBe('Cached Key');
      expect(second.name).toBe('Cached Key');
      expect(mockRedis.get).toHaveBeenCalledTimes(1);
      expect(mockPrisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('should fall back to redis cache after in-process cache ttl expires', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-22T11:00:00.000Z'));
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          id: 'key_1',
          userId: 'user_1',
          name: 'Cached Key',
          user: {
            id: 'user_1',
            email: 'cached@example.com',
            name: null,
            subscriptionTier: 'FREE',
            isAdmin: false,
          },
        }),
      );

      await service.validateKey(validApiKey);
      vi.advanceTimersByTime(IN_PROCESS_CACHE_TTL_MS + 1);
      await service.validateKey(validApiKey);

      expect(mockRedis.get).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should evict the oldest in-process validation entries when the cache exceeds its cap', async () => {
      const setInProcessCache = (service as any).setInProcessCache.bind(
        service,
      );
      const cache = (service as any).inProcessValidationCache as Map<
        string,
        { value: unknown; expiresAtMs: number }
      >;

      for (let index = 0; index < 10_000; index += 1) {
        setInProcessCache(`key-${index}`, {
          id: `api-key-${index}`,
          userId: `user-${index}`,
          name: `Key ${index}`,
          user: {
            id: `user-${index}`,
            email: `user-${index}@example.com`,
            name: null,
            subscriptionTier: 'FREE',
            isAdmin: false,
          },
        });
      }

      setInProcessCache('key-overflow', {
        id: 'api-key-overflow',
        userId: 'user-overflow',
        name: 'Overflow Key',
        user: {
          id: 'user-overflow',
          email: 'overflow@example.com',
          name: null,
          subscriptionTier: 'FREE',
          isAdmin: false,
        },
      });

      expect(cache.size).toBeLessThanOrEqual(10_000);
      expect(cache.has('key-0')).toBe(false);
      expect(cache.has('key-overflow')).toBe(true);
    });

    it('should invalidate in-process cache when key is deactivated', async () => {
      mockPrisma.apiKey.findUnique
        .mockResolvedValueOnce({
          id: 'key_1',
          userId: 'user_1',
          name: 'Test Key',
          isActive: true,
          expiresAt: null,
          user: {
            id: 'user_1',
            email: 'test@example.com',
            name: 'Test User',
            deletedAt: null,
            isAdmin: false,
            subscription: { tier: 'PRO', status: 'ACTIVE' },
          },
        })
        .mockResolvedValueOnce({
          id: 'key_1',
          isActive: false,
          expiresAt: null,
          user: { id: 'user_1', deletedAt: null },
        });
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'key_1',
        keyHash: hashApiKey(validApiKey),
      });
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key_1',
        name: 'Test Key',
        keyPrefix: 'ah_',
        keyTail: validApiKey.slice(-4),
        isActive: false,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await service.validateKey(validApiKey);
      await service.update('user_1', 'key_1', { isActive: false });

      await expect(service.validateKey(validApiKey)).rejects.toThrow(
        'inactive',
      );
      expect(mockRedis.del).toHaveBeenCalledWith(
        `apikey:${hashApiKey(validApiKey)}`,
      );
    });

    it('should cache validation result after database lookup', async () => {
      const keyHash = hashApiKey(validApiKey);
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key_1',
        userId: 'user_1',
        name: 'Test Key',
        isActive: true,
        expiresAt: null,
        user: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test User',
          deletedAt: null,
          isAdmin: false,
          subscription: { tier: 'PRO', status: 'ACTIVE' },
        },
      });

      await service.validateKey(validApiKey);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `apikey:${keyHash}`,
        expect.any(String),
        60,
      );
    });
  });
});
