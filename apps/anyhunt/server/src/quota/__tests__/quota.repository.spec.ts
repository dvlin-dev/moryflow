/**
 * QuotaRepository 单元测试
 * 测试配额数据访问层
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { QuotaRepository } from '../quota.repository';
import type { PrismaService } from '../../prisma/prisma.service';

describe('QuotaRepository', () => {
  let repository: QuotaRepository;
  let mockPrisma: {
    quota: {
      findUnique: Mock;
      count: Mock;
      create: Mock;
      update: Mock;
    };
    quotaTransaction: {
      count: Mock;
      create: Mock;
    };
    $transaction: Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      quota: {
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      quotaTransaction: {
        count: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    repository = new QuotaRepository(mockPrisma as unknown as PrismaService);
  });

  // ============ findByUserId ============

  describe('findByUserId', () => {
    it('should return quota when exists', async () => {
      const quota = {
        userId: 'user_1',
        monthlyLimit: 1000,
        monthlyUsed: 100,
        purchasedQuota: 50,
      };
      mockPrisma.quota.findUnique.mockResolvedValue(quota);

      const result = await repository.findByUserId('user_1');

      expect(result).toEqual(quota);
      expect(mockPrisma.quota.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
      });
    });

    it('should return null when not exists', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue(null);

      const result = await repository.findByUserId('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ============ exists ============

  describe('exists', () => {
    it('should return true when quota exists', async () => {
      mockPrisma.quota.count.mockResolvedValue(1);

      const result = await repository.exists('user_1');

      expect(result).toBe(true);
      expect(mockPrisma.quota.count).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
      });
    });

    it('should return false when quota not exists', async () => {
      mockPrisma.quota.count.mockResolvedValue(0);

      const result = await repository.exists('nonexistent');

      expect(result).toBe(false);
    });
  });

  // ============ hasRefundForReference ============

  describe('hasRefundForReference', () => {
    it('should return true when refund exists', async () => {
      mockPrisma.quotaTransaction.count.mockResolvedValue(1);

      const result = await repository.hasRefundForReference('user_1', 'ref_1');

      expect(result).toBe(true);
      expect(mockPrisma.quotaTransaction.count).toHaveBeenCalledWith({
        where: {
          userId: 'user_1',
          type: 'REFUND',
          reason: 'ref_1',
        },
      });
    });

    it('should return false when refund not exists', async () => {
      mockPrisma.quotaTransaction.count.mockResolvedValue(0);

      const result = await repository.hasRefundForReference('user_1', 'ref_1');

      expect(result).toBe(false);
    });
  });

  // ============ create ============

  describe('create', () => {
    it('should create quota with default limit', async () => {
      const createdQuota = {
        userId: 'new_user',
        monthlyLimit: 0,
        monthlyUsed: 0,
        purchasedQuota: 0,
      };
      mockPrisma.quota.create.mockResolvedValue(createdQuota);

      const result = await repository.create('new_user');

      expect(result).toEqual(createdQuota);
      expect(mockPrisma.quota.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'new_user',
          monthlyLimit: 0, // DEFAULT_MONTHLY_QUOTA (FREE tier)
          monthlyUsed: 0,
          periodStartAt: expect.any(Date),
          periodEndAt: expect.any(Date),
          purchasedQuota: 0,
        }),
      });
    });

    it('should create quota with custom limit', async () => {
      const createdQuota = {
        userId: 'new_user',
        monthlyLimit: 5000,
        monthlyUsed: 0,
        purchasedQuota: 0,
      };
      mockPrisma.quota.create.mockResolvedValue(createdQuota);

      const result = await repository.create('new_user', 5000);

      expect(result.monthlyLimit).toBe(5000);
      expect(mockPrisma.quota.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          monthlyLimit: 5000,
        }),
      });
    });
  });

  // ============ updateMonthlyLimit ============

  describe('updateMonthlyLimit', () => {
    it('should update monthly limit', async () => {
      const updatedQuota = { userId: 'user_1', monthlyLimit: 20000 };
      mockPrisma.quota.update.mockResolvedValue(updatedQuota);

      const result = await repository.updateMonthlyLimit('user_1', 20000);

      expect(result.monthlyLimit).toBe(20000);
      expect(mockPrisma.quota.update).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        data: { monthlyLimit: 20000 },
      });
    });
  });

  // ============ Transaction Operations ============

  describe('deductMonthlyInTransaction', () => {
    it('should execute transaction with correct operations', async () => {
      const transactionResult = {
        quota: { userId: 'user_1', monthlyUsed: 101 },
        transaction: { id: 'tx_1', balanceBefore: 900, balanceAfter: 899 },
      };

      // Mock $transaction to execute the callback
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            quota: {
              findUnique: vi.fn().mockResolvedValue({
                userId: 'user_1',
                monthlyLimit: 1000,
                monthlyUsed: 100,
              }),
              update: vi.fn().mockResolvedValue(transactionResult.quota),
            },
            quotaTransaction: {
              create: vi.fn().mockResolvedValue(transactionResult.transaction),
            },
          };
          return callback(txMock);
        },
      );

      const result = await repository.deductMonthlyInTransaction(
        'user_1',
        1,
        'ss_1',
      );

      expect(result.quota.monthlyUsed).toBe(101);
      expect(result.transaction.balanceBefore).toBe(900);
      expect(result.transaction.balanceAfter).toBe(899);
    });

    it('should throw error when quota not found in transaction', async () => {
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            quota: {
              findUnique: vi.fn().mockResolvedValue(null),
            },
          };
          return callback(txMock);
        },
      );

      await expect(
        repository.deductMonthlyInTransaction('nonexistent', 1),
      ).rejects.toThrow('Quota not found');
    });
  });

  describe('deductPurchasedInTransaction', () => {
    it('should execute transaction correctly', async () => {
      const transactionResult = {
        quota: { userId: 'user_1', purchasedQuota: 49 },
        transaction: { id: 'tx_2', balanceBefore: 50, balanceAfter: 49 },
      };

      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            quota: {
              findUnique: vi.fn().mockResolvedValue({
                userId: 'user_1',
                purchasedQuota: 50,
              }),
              update: vi.fn().mockResolvedValue(transactionResult.quota),
            },
            quotaTransaction: {
              create: vi.fn().mockResolvedValue(transactionResult.transaction),
            },
          };
          return callback(txMock);
        },
      );

      const result = await repository.deductPurchasedInTransaction(
        'user_1',
        1,
        'ss_1',
      );

      expect(result.quota.purchasedQuota).toBe(49);
      expect(result.transaction.balanceBefore).toBe(50);
    });
  });

  describe('refundInTransaction', () => {
    it('should refund to monthly quota', async () => {
      const transactionResult = {
        quota: { userId: 'user_1', monthlyUsed: 99 },
        transaction: { id: 'tx_refund', balanceBefore: 899, balanceAfter: 900 },
      };

      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            quota: {
              findUnique: vi.fn().mockResolvedValue({
                userId: 'user_1',
                monthlyLimit: 1000,
                monthlyUsed: 100,
                purchasedQuota: 50,
              }),
              update: vi.fn().mockResolvedValue(transactionResult.quota),
            },
            quotaTransaction: {
              create: vi.fn().mockResolvedValue(transactionResult.transaction),
            },
          };
          return callback(txMock);
        },
      );

      const result = await repository.refundInTransaction(
        'user_1',
        1,
        'MONTHLY',
        'ss_1',
      );

      expect(result.transaction.balanceAfter).toBe(900);
    });

    it('should refund to purchased quota', async () => {
      const transactionResult = {
        quota: { userId: 'user_1', purchasedQuota: 51 },
        transaction: { id: 'tx_refund', balanceBefore: 50, balanceAfter: 51 },
      };

      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            quota: {
              findUnique: vi.fn().mockResolvedValue({
                userId: 'user_1',
                monthlyLimit: 1000,
                monthlyUsed: 100,
                purchasedQuota: 50,
              }),
              update: vi.fn().mockResolvedValue(transactionResult.quota),
            },
            quotaTransaction: {
              create: vi.fn().mockResolvedValue(transactionResult.transaction),
            },
          };
          return callback(txMock);
        },
      );

      const result = await repository.refundInTransaction(
        'user_1',
        1,
        'PURCHASED',
        'ss_1',
      );

      expect(result.transaction.balanceAfter).toBe(51);
    });
  });

  describe('resetPeriodInTransaction', () => {
    it('should reset period and return previous usage', async () => {
      const transactionResult = {
        quota: { userId: 'user_1', monthlyUsed: 0 },
        transaction: { id: 'tx_reset' },
        previousUsed: 500,
      };

      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            quota: {
              findUnique: vi.fn().mockResolvedValue({
                userId: 'user_1',
                monthlyLimit: 1000,
                monthlyUsed: 500,
              }),
              update: vi.fn().mockResolvedValue(transactionResult.quota),
            },
            quotaTransaction: {
              create: vi.fn().mockResolvedValue(transactionResult.transaction),
            },
          };
          return callback(txMock);
        },
      );

      const result = await repository.resetPeriodInTransaction('user_1');

      expect(result.previousUsed).toBe(500);
      expect(result.quota.monthlyUsed).toBe(0);
    });
  });

  describe('addPurchasedInTransaction', () => {
    it('should add purchased quota', async () => {
      const transactionResult = {
        quota: { userId: 'user_1', purchasedQuota: 150 },
        transaction: {
          id: 'tx_purchase',
          balanceBefore: 50,
          balanceAfter: 150,
        },
      };

      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            quota: {
              findUnique: vi.fn().mockResolvedValue({
                userId: 'user_1',
                purchasedQuota: 50,
              }),
              update: vi.fn().mockResolvedValue(transactionResult.quota),
            },
            quotaTransaction: {
              create: vi.fn().mockResolvedValue(transactionResult.transaction),
            },
          };
          return callback(txMock);
        },
      );

      const result = await repository.addPurchasedInTransaction(
        'user_1',
        100,
        'order_123',
      );

      expect(result.quota.purchasedQuota).toBe(150);
      expect(result.transaction.balanceAfter).toBe(150);
    });
  });
});
