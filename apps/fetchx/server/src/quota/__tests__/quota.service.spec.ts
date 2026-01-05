/**
 * QuotaService 单元测试
 * 测试配额业务逻辑层
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { QuotaService } from '../quota.service';
import type { QuotaRepository } from '../quota.repository';
import type { RedisService } from '../../redis/redis.service';
import {
  QuotaExceededError,
  QuotaNotFoundError,
  QuotaAlreadyExistsError,
  DuplicateRefundError,
  InvalidRefundError,
  ConcurrentLimitExceededError,
  RateLimitExceededError,
} from '../quota.errors';

describe('QuotaService', () => {
  let service: QuotaService;
  let mockRepository: {
    findByUserId: Mock;
    exists: Mock;
    create: Mock;
    deductMonthlyInTransaction: Mock;
    deductPurchasedInTransaction: Mock;
    hasRefundForScreenshot: Mock;
    refundInTransaction: Mock;
    resetPeriodInTransaction: Mock;
    addPurchasedInTransaction: Mock;
    updateMonthlyLimit: Mock;
  };
  let mockRedis: {
    incrementConcurrent: Mock;
    decrementConcurrent: Mock;
    checkRateLimit: Mock;
  };

  // 创建一个未过期的配额记录
  const createValidQuota = (
    overrides: Partial<{
      monthlyLimit: number;
      monthlyUsed: number;
      purchasedQuota: number;
      periodEndAt: Date;
      periodStartAt: Date;
    }> = {},
  ) => ({
    userId: 'user_1',
    monthlyLimit: 1000,
    monthlyUsed: 100,
    purchasedQuota: 50,
    periodStartAt: new Date(),
    periodEndAt: new Date(Date.now() + 86400000), // 明天
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      findByUserId: vi.fn(),
      exists: vi.fn(),
      create: vi.fn(),
      deductMonthlyInTransaction: vi.fn(),
      deductPurchasedInTransaction: vi.fn(),
      hasRefundForScreenshot: vi.fn(),
      refundInTransaction: vi.fn(),
      resetPeriodInTransaction: vi.fn(),
      addPurchasedInTransaction: vi.fn(),
      updateMonthlyLimit: vi.fn(),
    };
    mockRedis = {
      incrementConcurrent: vi.fn(),
      decrementConcurrent: vi.fn(),
      checkRateLimit: vi.fn(),
    };
    service = new QuotaService(
      mockRepository as unknown as QuotaRepository,
      mockRedis as unknown as RedisService,
    );
  });

  // ============ getStatus ============

  describe('getStatus', () => {
    it('should return quota status when quota exists', async () => {
      const quota = createValidQuota();
      mockRepository.findByUserId.mockResolvedValue(quota);

      const result = await service.getStatus('user_1');

      expect(result.monthly.limit).toBe(1000);
      expect(result.monthly.used).toBe(100);
      expect(result.monthly.remaining).toBe(900);
      expect(result.purchased).toBe(50);
      expect(result.totalRemaining).toBe(950);
    });

    it('should throw QuotaNotFoundError when quota not exists', async () => {
      mockRepository.findByUserId.mockResolvedValue(null);

      await expect(service.getStatus('nonexistent')).rejects.toThrow(
        QuotaNotFoundError,
      );
    });

    it('should reset period when expired', async () => {
      const expiredQuota = createValidQuota({
        periodEndAt: new Date(Date.now() - 1000), // 已过期
        monthlyUsed: 500,
      });
      const resetQuota = createValidQuota({
        monthlyUsed: 0,
        periodEndAt: new Date(Date.now() + 86400000 * 30),
      });
      mockRepository.findByUserId
        .mockResolvedValueOnce(expiredQuota)
        .mockResolvedValueOnce(resetQuota);
      mockRepository.resetPeriodInTransaction.mockResolvedValue({
        quota: resetQuota,
        transaction: { id: 'tx_1' },
        previousUsed: 500,
      });

      const result = await service.getStatus('user_1');

      expect(mockRepository.resetPeriodInTransaction).toHaveBeenCalledWith(
        'user_1',
      );
      expect(result.monthly.used).toBe(0);
    });
  });

  // ============ checkAvailable ============

  describe('checkAvailable', () => {
    it('should return true when quota is sufficient', async () => {
      mockRepository.findByUserId.mockResolvedValue(createValidQuota());

      const result = await service.checkAvailable('user_1', 100);

      expect(result).toBe(true);
    });

    it('should return false when quota is insufficient', async () => {
      mockRepository.findByUserId.mockResolvedValue(
        createValidQuota({
          monthlyLimit: 100,
          monthlyUsed: 100,
          purchasedQuota: 0,
        }),
      );

      const result = await service.checkAvailable('user_1', 1);

      expect(result).toBe(false);
    });
  });

  // ============ deduct ============

  describe('deduct', () => {
    it('should deduct from monthly quota when sufficient', async () => {
      mockRepository.findByUserId.mockResolvedValue(createValidQuota());
      mockRepository.deductMonthlyInTransaction.mockResolvedValue({
        quota: createValidQuota({ monthlyUsed: 101 }),
        transaction: { id: 'tx_1', balanceBefore: 900, balanceAfter: 899 },
      });

      const result = await service.deduct('user_1', 1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.source).toBe('MONTHLY');
      }
      expect(mockRepository.deductMonthlyInTransaction).toHaveBeenCalledWith(
        'user_1',
        1,
        undefined,
      );
    });

    it('should deduct from purchased quota when monthly exhausted', async () => {
      mockRepository.findByUserId.mockResolvedValue(
        createValidQuota({
          monthlyLimit: 100,
          monthlyUsed: 100,
          purchasedQuota: 50,
        }),
      );
      mockRepository.deductPurchasedInTransaction.mockResolvedValue({
        quota: createValidQuota({ purchasedQuota: 49 }),
        transaction: { id: 'tx_2', balanceBefore: 50, balanceAfter: 49 },
      });

      const result = await service.deduct('user_1', 1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.source).toBe('PURCHASED');
      }
      expect(mockRepository.deductPurchasedInTransaction).toHaveBeenCalled();
    });

    it('should return failure when all quota exhausted', async () => {
      mockRepository.findByUserId.mockResolvedValue(
        createValidQuota({
          monthlyLimit: 100,
          monthlyUsed: 100,
          purchasedQuota: 0,
        }),
      );

      const result = await service.deduct('user_1', 1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.available).toBe(0);
        expect(result.required).toBe(1);
      }
    });

    it('should throw QuotaNotFoundError when user has no quota', async () => {
      mockRepository.findByUserId.mockResolvedValue(null);

      await expect(service.deduct('nonexistent', 1)).rejects.toThrow(
        QuotaNotFoundError,
      );
    });

    it('should pass reason to repository', async () => {
      mockRepository.findByUserId.mockResolvedValue(createValidQuota());
      mockRepository.deductMonthlyInTransaction.mockResolvedValue({
        quota: createValidQuota(),
        transaction: { id: 'tx_1', balanceBefore: 900, balanceAfter: 899 },
      });

      await service.deduct('user_1', 1, 'screenshot_123');

      expect(mockRepository.deductMonthlyInTransaction).toHaveBeenCalledWith(
        'user_1',
        1,
        'screenshot_123',
      );
    });
  });

  // ============ deductOrThrow ============

  describe('deductOrThrow', () => {
    it('should return result when successful', async () => {
      mockRepository.findByUserId.mockResolvedValue(createValidQuota());
      mockRepository.deductMonthlyInTransaction.mockResolvedValue({
        quota: createValidQuota(),
        transaction: { id: 'tx_1', balanceBefore: 900, balanceAfter: 899 },
      });

      const result = await service.deductOrThrow('user_1', 1);

      expect(result.source).toBe('MONTHLY');
      expect(result.transactionId).toBe('tx_1');
    });

    it('should throw QuotaExceededError when insufficient', async () => {
      mockRepository.findByUserId.mockResolvedValue(
        createValidQuota({
          monthlyLimit: 0,
          monthlyUsed: 0,
          purchasedQuota: 0,
        }),
      );

      await expect(service.deductOrThrow('user_1', 1)).rejects.toThrow(
        QuotaExceededError,
      );
    });
  });

  // ============ refund ============

  describe('refund', () => {
    it('should refund successfully', async () => {
      mockRepository.findByUserId.mockResolvedValue(createValidQuota());
      mockRepository.hasRefundForScreenshot.mockResolvedValue(false);
      mockRepository.refundInTransaction.mockResolvedValue({
        quota: createValidQuota({ monthlyUsed: 99 }),
        transaction: { id: 'tx_refund', balanceBefore: 899, balanceAfter: 900 },
      });

      const result = await service.refund({
        userId: 'user_1',
        screenshotId: 'ss_1',
        source: 'MONTHLY',
        amount: 1,
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('tx_refund');
    });

    it('should throw DuplicateRefundError for duplicate refund', async () => {
      mockRepository.hasRefundForScreenshot.mockResolvedValue(true);

      await expect(
        service.refund({
          userId: 'user_1',
          screenshotId: 'ss_1',
          source: 'MONTHLY',
          amount: 1,
        }),
      ).rejects.toThrow(DuplicateRefundError);
    });

    it('should throw InvalidRefundError for non-positive amount', async () => {
      mockRepository.hasRefundForScreenshot.mockResolvedValue(false);

      await expect(
        service.refund({
          userId: 'user_1',
          screenshotId: 'ss_1',
          source: 'MONTHLY',
          amount: 0,
        }),
      ).rejects.toThrow(InvalidRefundError);

      await expect(
        service.refund({
          userId: 'user_1',
          screenshotId: 'ss_1',
          source: 'MONTHLY',
          amount: -1,
        }),
      ).rejects.toThrow(InvalidRefundError);
    });

    it('should return failure when refund transaction fails', async () => {
      mockRepository.hasRefundForScreenshot.mockResolvedValue(false);
      mockRepository.refundInTransaction.mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.refund({
        userId: 'user_1',
        screenshotId: 'ss_1',
        source: 'MONTHLY',
        amount: 1,
      });

      expect(result.success).toBe(false);
    });
  });

  // ============ initialize ============

  describe('initialize', () => {
    it('should create quota for new user', async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(
        createValidQuota({ monthlyLimit: 100 }),
      );

      await service.initialize({ userId: 'new_user', monthlyLimit: 100 });

      expect(mockRepository.create).toHaveBeenCalledWith('new_user', 100);
    });

    it('should throw QuotaAlreadyExistsError for existing user', async () => {
      mockRepository.exists.mockResolvedValue(true);

      await expect(
        service.initialize({ userId: 'existing_user', monthlyLimit: 100 }),
      ).rejects.toThrow(QuotaAlreadyExistsError);
    });
  });

  // ============ ensureExists ============

  describe('ensureExists', () => {
    it('should not create if already exists', async () => {
      mockRepository.exists.mockResolvedValue(true);

      await service.ensureExists('user_1', 'FREE');

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should create with tier quota if not exists', async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(createValidQuota());

      await service.ensureExists('new_user', 'PRO');

      // PRO tier has 20000 monthly quota
      expect(mockRepository.create).toHaveBeenCalledWith('new_user', 20000);
    });

    it('should use default tier if not specified', async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(createValidQuota());

      await service.ensureExists('new_user');

      // FREE tier has 100 monthly quota
      expect(mockRepository.create).toHaveBeenCalledWith('new_user', 100);
    });
  });

  // ============ addPurchased ============

  describe('addPurchased', () => {
    it('should add purchased quota', async () => {
      mockRepository.addPurchasedInTransaction.mockResolvedValue({
        quota: createValidQuota({ purchasedQuota: 150 }),
        transaction: { id: 'tx_purchase' },
      });

      await service.addPurchased({
        userId: 'user_1',
        amount: 100,
        orderId: 'order_123',
      });

      expect(mockRepository.addPurchasedInTransaction).toHaveBeenCalledWith(
        'user_1',
        100,
        'order_123',
      );
    });
  });

  // ============ updateMonthlyLimit ============

  describe('updateMonthlyLimit', () => {
    it('should update monthly limit based on tier', async () => {
      mockRepository.updateMonthlyLimit.mockResolvedValue(createValidQuota());

      await service.updateMonthlyLimit('user_1', 'TEAM');

      // TEAM tier has 60000 monthly quota
      expect(mockRepository.updateMonthlyLimit).toHaveBeenCalledWith(
        'user_1',
        60000,
      );
    });
  });

  // ============ incrementConcurrent ============

  describe('incrementConcurrent', () => {
    it('should return current count when within limit', async () => {
      mockRedis.incrementConcurrent.mockResolvedValue(1);

      const result = await service.incrementConcurrent('user_1', 'FREE');

      expect(result).toBe(1);
    });

    it('should throw ConcurrentLimitExceededError when exceeding limit', async () => {
      // FREE tier maxConcurrent is 2
      mockRedis.incrementConcurrent.mockResolvedValue(3);

      await expect(
        service.incrementConcurrent('user_1', 'FREE'),
      ).rejects.toThrow(ConcurrentLimitExceededError);

      // Should decrement after throwing
      expect(mockRedis.decrementConcurrent).toHaveBeenCalledWith('user_1');
    });

    it('should allow higher concurrency for higher tiers', async () => {
      // PRO tier maxConcurrent is 10
      mockRedis.incrementConcurrent.mockResolvedValue(8);

      const result = await service.incrementConcurrent('user_1', 'PRO');

      expect(result).toBe(8);
    });
  });

  // ============ decrementConcurrent ============

  describe('decrementConcurrent', () => {
    it('should decrement concurrent count', async () => {
      mockRedis.decrementConcurrent.mockResolvedValue(0);

      await service.decrementConcurrent('user_1');

      expect(mockRedis.decrementConcurrent).toHaveBeenCalledWith('user_1');
    });
  });

  // ============ checkRateLimit ============

  describe('checkRateLimit', () => {
    it('should pass when within rate limit', async () => {
      mockRedis.checkRateLimit.mockResolvedValue({
        allowed: true,
        current: 5,
        remaining: 5,
      });

      await expect(
        service.checkRateLimit('user_1', 'FREE'),
      ).resolves.not.toThrow();
    });

    it('should throw RateLimitExceededError when exceeding limit', async () => {
      mockRedis.checkRateLimit.mockResolvedValue({
        allowed: false,
        current: 11,
        remaining: 0,
      });

      await expect(service.checkRateLimit('user_1', 'FREE')).rejects.toThrow(
        RateLimitExceededError,
      );
    });

    it('should use tier-specific rate limit', async () => {
      mockRedis.checkRateLimit.mockResolvedValue({
        allowed: true,
        current: 1,
        remaining: 59,
      });

      await service.checkRateLimit('user_1', 'PRO');

      // PRO tier has 60 requests per minute
      expect(mockRedis.checkRateLimit).toHaveBeenCalledWith('user_1', 60, 60);
    });
  });

  // ============ isFeatureAllowed ============

  describe('isFeatureAllowed', () => {
    it('should return true for allowed features', () => {
      expect(service.isFeatureAllowed('FREE', 'fullPage')).toBe(true);
      expect(service.isFeatureAllowed('PRO', 'webhook')).toBe(true);
    });

    it('should return false for disallowed features', () => {
      expect(service.isFeatureAllowed('FREE', 'webhook')).toBe(false);
      expect(service.isFeatureAllowed('FREE', 'scripts')).toBe(false);
    });
  });

  // ============ getTierLimits ============

  describe('getTierLimits', () => {
    it('should return tier config', () => {
      const config = service.getTierLimits('PRO');

      expect(config.maxWidth).toBe(3840);
      expect(config.maxHeight).toBe(2160);
      expect(config.monthlyQuota).toBe(20000);
    });
  });
});
