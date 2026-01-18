/**
 * Billing Service Tests
 *
 * [PROVIDES]: BillingService 单元测试
 * [POS]: 测试扣费、退费逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BillingService } from '../billing.service';
import { DuplicateRefundError } from '../../quota/quota.errors';
import type { DeductResult, RefundResult } from '../../quota/quota.types';

describe('BillingService', () => {
  let service: BillingService;
  let mockQuotaService: {
    deductOrThrow: ReturnType<typeof vi.fn>;
    refund: ReturnType<typeof vi.fn>;
  };

  const mockDeductResult: DeductResult = {
    success: true,
    breakdown: [
      {
        source: 'MONTHLY',
        amount: 1,
        transactionId: 'tx-1',
        balanceBefore: 100,
        balanceAfter: 99,
      },
    ],
  };

  const mockRefundResult: RefundResult = {
    success: true,
    transactionId: 'tx-2',
    balanceBefore: 99,
    balanceAfter: 100,
  };

  beforeEach(() => {
    mockQuotaService = {
      deductOrThrow: vi.fn(),
      refund: vi.fn(),
    };

    service = new BillingService(mockQuotaService as any);
  });

  // ========== deductOrThrow ==========

  describe('deductOrThrow', () => {
    it('should deduct quota for valid billing key', async () => {
      mockQuotaService.deductOrThrow.mockResolvedValue(mockDeductResult);

      const result = await service.deductOrThrow({
        userId: 'user-1',
        billingKey: 'fetchx.scrape',
        referenceId: 'ref-1',
      });

      expect(result).not.toBeNull();
      expect(result?.deduct).toEqual(mockDeductResult);
      expect(result?.amount).toBe(1);
      expect(mockQuotaService.deductOrThrow).toHaveBeenCalledWith(
        'user-1',
        1,
        'fetchx.scrape:ref-1',
      );
    });

    it('should skip deduction when fromCache is true and skipIfFromCache is enabled', async () => {
      const result = await service.deductOrThrow({
        userId: 'user-1',
        billingKey: 'fetchx.scrape', // This key has skipIfFromCache: true
        referenceId: 'ref-1',
        fromCache: true,
      });

      expect(result).toBeNull();
      expect(mockQuotaService.deductOrThrow).not.toHaveBeenCalled();
    });

    it('should deduct when fromCache is false even if skipIfFromCache is enabled', async () => {
      mockQuotaService.deductOrThrow.mockResolvedValue(mockDeductResult);

      const result = await service.deductOrThrow({
        userId: 'user-1',
        billingKey: 'fetchx.scrape',
        referenceId: 'ref-1',
        fromCache: false,
      });

      expect(result).not.toBeNull();
      expect(mockQuotaService.deductOrThrow).toHaveBeenCalled();
    });

    it('should deduct for keys without skipIfFromCache even when fromCache is true', async () => {
      mockQuotaService.deductOrThrow.mockResolvedValue(mockDeductResult);

      const result = await service.deductOrThrow({
        userId: 'user-1',
        billingKey: 'fetchx.crawl', // This key does not have skipIfFromCache
        referenceId: 'ref-1',
        fromCache: true,
      });

      expect(result).not.toBeNull();
      expect(mockQuotaService.deductOrThrow).toHaveBeenCalled();
    });

    it('should respect explicit skipIfFromCache param over rule default', async () => {
      mockQuotaService.deductOrThrow.mockResolvedValue(mockDeductResult);

      // Even though fetchx.scrape has skipIfFromCache: true, we override it
      const result = await service.deductOrThrow({
        userId: 'user-1',
        billingKey: 'fetchx.scrape',
        referenceId: 'ref-1',
        skipIfFromCache: false,
        fromCache: true,
      });

      expect(result).not.toBeNull();
      expect(mockQuotaService.deductOrThrow).toHaveBeenCalled();
    });

    it('should use correct reason format', async () => {
      mockQuotaService.deductOrThrow.mockResolvedValue(mockDeductResult);

      await service.deductOrThrow({
        userId: 'user-1',
        billingKey: 'memox.memory.create',
        referenceId: 'memory-123',
      });

      expect(mockQuotaService.deductOrThrow).toHaveBeenCalledWith(
        'user-1',
        1,
        'memox.memory.create:memory-123',
      );
    });

    it('should propagate errors from quotaService', async () => {
      const error = new Error('Quota exceeded');
      mockQuotaService.deductOrThrow.mockRejectedValue(error);

      await expect(
        service.deductOrThrow({
          userId: 'user-1',
          billingKey: 'fetchx.scrape',
          referenceId: 'ref-1',
        }),
      ).rejects.toThrow('Quota exceeded');
    });

    it.each([
      'fetchx.scrape',
      'fetchx.batchScrape',
      'fetchx.crawl',
      'fetchx.map',
      'fetchx.extract',
      'fetchx.search',
      'memox.memory.create',
      'memox.memory.search',
    ] as const)('should handle billing key: %s', async (billingKey) => {
      mockQuotaService.deductOrThrow.mockResolvedValue(mockDeductResult);

      const result = await service.deductOrThrow({
        userId: 'user-1',
        billingKey,
        referenceId: 'ref-1',
      });

      expect(result).not.toBeNull();
      expect(mockQuotaService.deductOrThrow).toHaveBeenCalledWith(
        'user-1',
        expect.any(Number),
        `${billingKey}:ref-1`,
      );
    });
  });

  // ========== refundOnFailure ==========

  describe('refundOnFailure', () => {
    it('should refund when refundOnFailure is enabled', async () => {
      mockQuotaService.refund.mockResolvedValue(mockRefundResult);

      const result = await service.refundOnFailure({
        userId: 'user-1',
        billingKey: 'fetchx.scrape', // Has refundOnFailure: true
        referenceId: 'ref-1',
        breakdown: mockDeductResult.breakdown,
      });

      expect(result.success).toBe(true);
      expect(mockQuotaService.refund).toHaveBeenCalledWith({
        userId: 'user-1',
        referenceId: 'refund:tx-1',
        deductTransactionId: 'tx-1',
        source: 'MONTHLY',
        amount: 1,
      });
    });

    it('should return success without refund when breakdown is empty', async () => {
      const result = await service.refundOnFailure({
        userId: 'user-1',
        billingKey: 'fetchx.scrape',
        referenceId: 'ref-1',
        breakdown: [],
      });

      expect(result.success).toBe(true);
      expect(mockQuotaService.refund).not.toHaveBeenCalled();
    });

    it('should skip items with non-positive amount', async () => {
      const result = await service.refundOnFailure({
        userId: 'user-1',
        billingKey: 'fetchx.scrape',
        referenceId: 'ref-1',
        breakdown: [
          {
            source: 'MONTHLY',
            amount: 0,
            transactionId: 'tx-1',
            balanceBefore: 0,
            balanceAfter: 0,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(mockQuotaService.refund).not.toHaveBeenCalled();
    });

    it('should handle DuplicateRefundError gracefully', async () => {
      mockQuotaService.refund.mockRejectedValue(
        new DuplicateRefundError('Already refunded'),
      );

      const result = await service.refundOnFailure({
        userId: 'user-1',
        billingKey: 'fetchx.scrape',
        referenceId: 'ref-1',
        breakdown: mockDeductResult.breakdown,
      });

      expect(result.success).toBe(true);
    });

    it('should return failure for other errors', async () => {
      mockQuotaService.refund.mockRejectedValue(new Error('Database error'));

      const result = await service.refundOnFailure({
        userId: 'user-1',
        billingKey: 'fetchx.scrape',
        referenceId: 'ref-1',
        breakdown: mockDeductResult.breakdown,
      });

      expect(result.success).toBe(false);
    });

    it('should handle non-Error objects in catch', async () => {
      mockQuotaService.refund.mockRejectedValue('String error');

      const result = await service.refundOnFailure({
        userId: 'user-1',
        billingKey: 'fetchx.scrape',
        referenceId: 'ref-1',
        breakdown: mockDeductResult.breakdown,
      });

      expect(result.success).toBe(false);
    });

    it('should work with PURCHASED source', async () => {
      mockQuotaService.refund.mockResolvedValue(mockRefundResult);

      const result = await service.refundOnFailure({
        userId: 'user-1',
        billingKey: 'fetchx.scrape',
        referenceId: 'ref-1',
        breakdown: [
          {
            source: 'PURCHASED',
            amount: 5,
            transactionId: 'tx-purchased',
            balanceBefore: 50,
            balanceAfter: 45,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(mockQuotaService.refund).toHaveBeenCalledWith({
        userId: 'user-1',
        referenceId: 'refund:tx-purchased',
        deductTransactionId: 'tx-purchased',
        source: 'PURCHASED',
        amount: 5,
      });
    });

    it.each([
      'fetchx.scrape',
      'fetchx.batchScrape',
      'fetchx.crawl',
      'fetchx.map',
      'fetchx.extract',
      'fetchx.search',
      'memox.memory.create',
      'memox.memory.search',
    ] as const)(
      'should process refund for billing key: %s',
      async (billingKey) => {
        mockQuotaService.refund.mockResolvedValue(mockRefundResult);

        const result = await service.refundOnFailure({
          userId: 'user-1',
          billingKey,
          referenceId: 'ref-1',
          breakdown: mockDeductResult.breakdown,
        });

        // All these keys have refundOnFailure: true
        expect(result.success).toBe(true);
        expect(mockQuotaService.refund).toHaveBeenCalled();
      },
    );
  });

  // ========== Integration scenarios ==========

  describe('deduct and refund flow', () => {
    it('should use same referenceId format for deduct and refund', async () => {
      mockQuotaService.deductOrThrow.mockResolvedValue(mockDeductResult);
      mockQuotaService.refund.mockResolvedValue(mockRefundResult);

      const deductResult = await service.deductOrThrow({
        userId: 'user-1',
        billingKey: 'fetchx.scrape',
        referenceId: 'operation-123',
      });

      expect(deductResult).not.toBeNull();

      await service.refundOnFailure({
        userId: 'user-1',
        billingKey: 'fetchx.scrape',
        referenceId: 'operation-123',
        breakdown: mockDeductResult.breakdown,
      });

      // Both should use the same referenceId format
      expect(mockQuotaService.deductOrThrow).toHaveBeenCalledWith(
        'user-1',
        1,
        'fetchx.scrape:operation-123',
      );
      expect(mockQuotaService.refund).toHaveBeenCalledWith({
        userId: 'user-1',
        referenceId: 'refund:tx-1',
        deductTransactionId: 'tx-1',
        source: 'MONTHLY',
        amount: 1,
      });
    });
  });
});
