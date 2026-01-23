/**
 * ApiKeyService 单元测试
 * 测试 API Key CRUD 和验证逻辑
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiKeyService } from '../api-key.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { VectorPrismaService } from '../../vector-prisma/vector-prisma.service';
import type { RedisService } from '../../redis/redis.service';
import { API_KEY_PREFIX } from '../api-key.constants';

/**
 * Mock 类型定义
 */
type MockPrisma = {
  apiKey: {
    create: Mock;
    findMany: Mock;
    findFirst: Mock;
    findUnique: Mock;
    update: Mock;
    delete: Mock;
  };
};

type MockVectorPrisma = {
  memory: { deleteMany: Mock };
  entity: { deleteMany: Mock };
  relation: { deleteMany: Mock };
};

type MockRedis = {
  get: Mock;
  set: Mock;
  del: Mock;
};

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let mockPrisma: MockPrisma;
  let mockVectorPrisma: MockVectorPrisma;
  let mockRedis: MockRedis;

  // 有效 API Key (ah_ + 64 hex chars)
  const validApiKey = `${API_KEY_PREFIX}${'a'.repeat(64)}`;

  beforeEach(() => {
    mockPrisma = {
      apiKey: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}), // Default mock for updateLastUsedAsync
        delete: vi.fn(),
      },
    };
    mockVectorPrisma = {
      memory: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      entity: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      relation: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };
    service = new ApiKeyService(
      mockPrisma as unknown as PrismaService,
      mockVectorPrisma as unknown as VectorPrismaService,
      mockRedis as unknown as RedisService,
    );
  });

  // ============ create ============

  describe('create', () => {
    it('should generate key with correct prefix', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key_1',
        name: 'Test Key',
        keyPrefix: 'ah_abcd1234',
      });

      const result = await service.create('user_1', {
        name: 'Test Key',
        expiresAt: undefined,
      });

      expect(result.key).toMatch(/^ah_[a-f0-9]{64}$/);
      expect(result.id).toBe('key_1');
      expect(result.name).toBe('Test Key');
    });

    it('should store hashed key in database', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key_1',
        name: 'Test Key',
        keyPrefix: 'ah_abcd1234',
      });

      await service.create('user_1', {
        name: 'Test Key',
        expiresAt: undefined,
      });

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_1',
          name: 'Test Key',
          keyHash: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA256 hash
          keyPrefix: expect.stringMatching(/^ah_.{8}$/),
        }),
      });
    });

    it('should handle expiresAt option', async () => {
      const expiresAt = new Date('2030-01-01');
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key_1',
        name: 'Test Key',
        keyPrefix: 'ah_abcd1234',
        expiresAt,
      });

      await service.create('user_1', { name: 'Test Key', expiresAt });

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt,
        }),
      });
    });
  });

  // ============ findAllByUser ============

  describe('findAllByUser', () => {
    it('should return all keys for user', async () => {
      const keys = [
        { id: 'key_1', name: 'Key 1', keyPrefix: 'ah_abc' },
        { id: 'key_2', name: 'Key 2', keyPrefix: 'ah_def' },
      ];
      mockPrisma.apiKey.findMany.mockResolvedValue(keys);

      const result = await service.findAllByUser('user_1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ============ findOne ============

  describe('findOne', () => {
    it('should return key when found', async () => {
      const key = { id: 'key_1', name: 'Test Key' };
      mockPrisma.apiKey.findFirst.mockResolvedValue(key);

      const result = await service.findOne('user_1', 'key_1');

      expect(result).toEqual(key);
    });

    it('should throw NotFoundException when key not found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user_1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ update ============

  describe('update', () => {
    it('should update key name', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'key_1',
        keyHash: 'hash_1',
      });
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key_1',
        name: 'Updated Name',
      });

      const result = await service.update('user_1', 'key_1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when key not found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user_1', 'nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should invalidate cache when key is deactivated', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'key_1',
        keyHash: 'hash_1',
      });
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key_1',
        isActive: false,
      });

      await service.update('user_1', 'key_1', { isActive: false });

      expect(mockRedis.del).toHaveBeenCalledWith('apikey:hash_1');
    });

    it('should invalidate cache when key is activated', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'key_1',
        keyHash: 'hash_1',
      });
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key_1',
        isActive: true,
      });

      await service.update('user_1', 'key_1', { isActive: true });

      expect(mockRedis.del).toHaveBeenCalledWith('apikey:hash_1');
    });
  });

  // ============ delete ============

  describe('delete', () => {
    it('should delete key and invalidate cache', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'key_1',
        keyHash: 'hash_1',
      });
      mockPrisma.apiKey.delete.mockResolvedValue({ id: 'key_1' });

      await service.delete('user_1', 'key_1');

      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'key_1' },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('apikey:hash_1');
    });

    it('should throw NotFoundException when key not found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.delete('user_1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ validateKey ============

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

    it('should throw ForbiddenException for non-existent key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      await expect(service.validateKey(validApiKey)).rejects.toThrow(
        'Invalid API key',
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
        expiresAt: new Date(Date.now() - 1000), // 已过期
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

    it('should downgrade tier when subscription is not active', async () => {
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
          subscription: { tier: 'PRO', status: 'CANCELED' },
        },
      });

      const result = await service.validateKey(validApiKey);

      expect(result.user.subscriptionTier).toBe('FREE');
    });

    it('should default to FREE tier when no subscription', async () => {
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
          subscription: null,
        },
      });

      const result = await service.validateKey(validApiKey);

      expect(result.user.subscriptionTier).toBe('FREE');
    });

    it('should use cache when available', async () => {
      const cached = {
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
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.validateKey(validApiKey);

      expect(result.name).toBe('Cached Key');
      expect(mockPrisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('should cache validation result after database lookup', async () => {
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
        expect.stringContaining('apikey:'),
        expect.any(String),
        60, // CACHE_TTL_SECONDS
      );
    });

    it('should handle cache read errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
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
          subscription: { tier: 'FREE', status: 'ACTIVE' },
        },
      });

      // Should still work despite cache error
      const result = await service.validateKey(validApiKey);

      expect(result.userId).toBe('user_1');
    });

    it('should handle cache write errors gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));
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
          subscription: { tier: 'FREE', status: 'ACTIVE' },
        },
      });

      // Should still work despite cache write error
      const result = await service.validateKey(validApiKey);

      expect(result.userId).toBe('user_1');
    });
  });
});
