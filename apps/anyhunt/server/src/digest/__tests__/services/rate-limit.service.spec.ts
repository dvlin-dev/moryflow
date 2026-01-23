/**
 * Digest Rate Limit Service Tests
 *
 * [PROVIDES]: DigestRateLimitService 单元测试
 * [POS]: 测试反垃圾限流逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { DigestRateLimitService } from '../../services/rate-limit.service';
import { createMockPrisma } from '../mocks';
import { ANTI_SPAM_LIMITS, SUBSCRIPTION_LIMITS } from '../../digest.constants';

describe('DigestRateLimitService', () => {
  let service: DigestRateLimitService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();

    // Add digestUserDailyOps mock
    (mockPrisma as any).digestUserDailyOps = {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    };

    service = new DigestRateLimitService(mockPrisma as any);
  });

  // ========== checkTopicOperation ==========

  describe('checkTopicOperation', () => {
    it('should allow operation within daily limit for FREE user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.digestUserDailyOps.findUnique.mockResolvedValue({
        topicCreates: 1,
        topicUpdates: 1,
      });

      await expect(
        service.checkTopicOperation('user-1', 'create'),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when daily limit exceeded for FREE user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.digestUserDailyOps.findUnique.mockResolvedValue({
        topicCreates: ANTI_SPAM_LIMITS.freeUserDailyTopicOps,
        topicUpdates: 0,
      });

      await expect(
        service.checkTopicOperation('user-1', 'create'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow unlimited operations for PRO user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'PRO', status: 'ACTIVE' },
      });

      await expect(
        service.checkTopicOperation('user-1', 'create'),
      ).resolves.not.toThrow();

      // Should not even check daily ops for non-FREE users
      expect(mockPrisma.digestUserDailyOps.findUnique).not.toHaveBeenCalled();
    });

    it('should treat null ops as 0', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.digestUserDailyOps.findUnique.mockResolvedValue(null);

      await expect(
        service.checkTopicOperation('user-1', 'update'),
      ).resolves.not.toThrow();
    });

    it('should default to FREE tier for user without subscription', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: null,
      });
      mockPrisma.digestUserDailyOps.findUnique.mockResolvedValue({
        topicCreates: ANTI_SPAM_LIMITS.freeUserDailyTopicOps,
        topicUpdates: 0,
      });

      await expect(
        service.checkTopicOperation('user-1', 'create'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ========== checkPublicTopicCount ==========

  describe('checkPublicTopicCount', () => {
    it('should allow creation within public topic limit for FREE user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.digestTopic.count.mockResolvedValue(0);

      await expect(
        service.checkPublicTopicCount('user-1'),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when public topic limit exceeded', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.digestTopic.count.mockResolvedValue(
        SUBSCRIPTION_LIMITS.FREE.maxPublicTopics,
      );

      await expect(service.checkPublicTopicCount('user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow more public topics for PRO tier', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'PRO', status: 'ACTIVE' },
      });
      mockPrisma.digestTopic.count.mockResolvedValue(
        SUBSCRIPTION_LIMITS.FREE.maxPublicTopics + 5,
      );

      await expect(
        service.checkPublicTopicCount('user-1'),
      ).resolves.not.toThrow();
    });

    it('should count only user public topics', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.digestTopic.count.mockResolvedValue(0);

      await service.checkPublicTopicCount('user-1');

      expect(mockPrisma.digestTopic.count).toHaveBeenCalledWith({
        where: {
          createdByUserId: 'user-1',
          visibility: 'PUBLIC',
        },
      });
    });
  });

  // ========== recordTopicOperation ==========

  describe('recordTopicOperation', () => {
    it('should upsert create operation', async () => {
      mockPrisma.digestUserDailyOps.upsert.mockResolvedValue({});

      await service.recordTopicOperation('user-1', 'create');

      expect(mockPrisma.digestUserDailyOps.upsert).toHaveBeenCalledWith({
        where: {
          userId_date: { userId: 'user-1', date: expect.any(String) },
        },
        create: {
          userId: 'user-1',
          date: expect.any(String),
          topicCreates: 1,
          topicUpdates: 0,
        },
        update: {
          topicCreates: { increment: 1 },
          topicUpdates: undefined,
        },
      });
    });

    it('should upsert update operation', async () => {
      mockPrisma.digestUserDailyOps.upsert.mockResolvedValue({});

      await service.recordTopicOperation('user-1', 'update');

      expect(mockPrisma.digestUserDailyOps.upsert).toHaveBeenCalledWith({
        where: {
          userId_date: { userId: 'user-1', date: expect.any(String) },
        },
        create: {
          userId: 'user-1',
          date: expect.any(String),
          topicCreates: 0,
          topicUpdates: 1,
        },
        update: {
          topicCreates: undefined,
          topicUpdates: { increment: 1 },
        },
      });
    });
  });

  // ========== getRemainingOperations ==========

  describe('getRemainingOperations', () => {
    it('should return remaining operations for FREE user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.digestUserDailyOps.findUnique.mockResolvedValue({
        topicCreates: 2,
        topicUpdates: 1,
      });

      const result = await service.getRemainingOperations('user-1');

      expect(result).toEqual({
        remaining: ANTI_SPAM_LIMITS.freeUserDailyTopicOps - 3,
        limit: ANTI_SPAM_LIMITS.freeUserDailyTopicOps,
        isUnlimited: false,
      });
    });

    it('should return full limit when no operations used', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.digestUserDailyOps.findUnique.mockResolvedValue(null);

      const result = await service.getRemainingOperations('user-1');

      expect(result.remaining).toBe(ANTI_SPAM_LIMITS.freeUserDailyTopicOps);
    });

    it('should return 0 when limit exceeded', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.digestUserDailyOps.findUnique.mockResolvedValue({
        topicCreates: ANTI_SPAM_LIMITS.freeUserDailyTopicOps + 5,
        topicUpdates: 0,
      });

      const result = await service.getRemainingOperations('user-1');

      expect(result.remaining).toBe(0);
    });

    it('should return unlimited for PRO tier', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'PRO', status: 'ACTIVE' },
      });

      const result = await service.getRemainingOperations('user-1');

      expect(result).toEqual({
        remaining: -1,
        limit: -1,
        isUnlimited: true,
      });
    });
  });

  // ========== getUserTier (private, tested via other methods) ==========

  describe('getUserTier (private)', () => {
    it('should default to FREE for null user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.digestUserDailyOps.findUnique.mockResolvedValue({
        topicCreates: ANTI_SPAM_LIMITS.freeUserDailyTopicOps,
        topicUpdates: 0,
      });

      // Should use FREE limit and fail
      await expect(
        service.checkTopicOperation('unknown-user', 'create'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
