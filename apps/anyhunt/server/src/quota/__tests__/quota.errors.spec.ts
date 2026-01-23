/**
 * Quota Errors 单元测试
 * 测试配额模块自定义错误类
 */
import { describe, it, expect } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import {
  QuotaError,
  QuotaExceededError,
  QuotaNotFoundError,
  QuotaAlreadyExistsError,
  InvalidRefundError,
  InvalidQuotaAmountError,
  InvalidPurchaseError,
  DuplicateRefundError,
  DuplicatePurchaseError,
  ConcurrentLimitExceededError,
  RateLimitExceededError,
  QuotaErrorCode,
} from '../quota.errors';

describe('Quota Errors', () => {
  describe('QuotaExceededError', () => {
    it('should have correct status and code', () => {
      const error = new QuotaExceededError(0, 1);

      expect(error.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      expect(error.code).toBe(QuotaErrorCode.QUOTA_EXCEEDED);
    });

    it('should include available and required in details', () => {
      const error = new QuotaExceededError(5, 10);

      expect(error.details).toEqual({ available: 5, required: 10 });
    });

    it('should format message correctly', () => {
      const error = new QuotaExceededError(5, 10);
      const response = error.getResponse() as { error: { message: string } };

      expect(response.error.message).toContain('Available: 5');
      expect(response.error.message).toContain('Required: 10');
    });

    it('should return structured response', () => {
      const error = new QuotaExceededError(0, 1);
      const response = error.getResponse() as {
        success: boolean;
        error: { code: string; message: string; details: unknown };
      };

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(QuotaErrorCode.QUOTA_EXCEEDED);
    });
  });

  describe('QuotaNotFoundError', () => {
    it('should have correct status and code', () => {
      const error = new QuotaNotFoundError('user_123');

      expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(error.code).toBe(QuotaErrorCode.QUOTA_NOT_FOUND);
    });

    it('should include userId in details', () => {
      const error = new QuotaNotFoundError('user_123');

      expect(error.details).toEqual({ userId: 'user_123' });
    });
  });

  describe('QuotaAlreadyExistsError', () => {
    it('should have correct status and code', () => {
      const error = new QuotaAlreadyExistsError('user_123');

      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(error.code).toBe(QuotaErrorCode.QUOTA_ALREADY_EXISTS);
    });

    it('should include userId in details', () => {
      const error = new QuotaAlreadyExistsError('user_456');

      expect(error.details).toEqual({ userId: 'user_456' });
    });
  });

  describe('InvalidRefundError', () => {
    it('should have correct status and code', () => {
      const error = new InvalidRefundError('Amount must be positive');

      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(error.code).toBe(QuotaErrorCode.INVALID_REFUND);
    });

    it('should include reason in details', () => {
      const error = new InvalidRefundError('Amount must be positive');

      expect(error.details).toEqual({ reason: 'Amount must be positive' });
    });

    it('should include reason in message', () => {
      const error = new InvalidRefundError('Invalid source');
      const response = error.getResponse() as { error: { message: string } };

      expect(response.error.message).toContain('Invalid source');
    });
  });

  describe('DuplicateRefundError', () => {
    it('should have correct status and code', () => {
      const error = new DuplicateRefundError('ss_123');

      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(error.code).toBe(QuotaErrorCode.DUPLICATE_REFUND);
    });

    it('should include referenceId in details', () => {
      const error = new DuplicateRefundError('ref_456');

      expect(error.details).toEqual({ referenceId: 'ref_456' });
    });
  });

  describe('InvalidQuotaAmountError', () => {
    it('should have correct status and code', () => {
      const error = new InvalidQuotaAmountError(0, 'invalid');

      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(error.code).toBe(QuotaErrorCode.INVALID_QUOTA_AMOUNT);
    });

    it('should include amount in details', () => {
      const error = new InvalidQuotaAmountError(-1);

      expect(error.details).toEqual({ amount: -1, reason: undefined });
    });
  });

  describe('InvalidPurchaseError', () => {
    it('should have correct status and code', () => {
      const error = new InvalidPurchaseError('orderId is required');

      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(error.code).toBe(QuotaErrorCode.INVALID_PURCHASE);
    });
  });

  describe('DuplicatePurchaseError', () => {
    it('should have correct status and code', () => {
      const error = new DuplicatePurchaseError('order_123');

      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(error.code).toBe(QuotaErrorCode.DUPLICATE_PURCHASE);
    });

    it('should include orderId in details', () => {
      const error = new DuplicatePurchaseError('order_456');

      expect(error.details).toEqual({ orderId: 'order_456' });
    });
  });

  describe('ConcurrentLimitExceededError', () => {
    it('should have correct status and code', () => {
      const error = new ConcurrentLimitExceededError(2, 2);

      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.code).toBe(QuotaErrorCode.CONCURRENT_LIMIT_EXCEEDED);
    });

    it('should include limit and current in details', () => {
      const error = new ConcurrentLimitExceededError(5, 5);

      expect(error.details).toEqual({ limit: 5, current: 5 });
    });

    it('should format message with limit', () => {
      const error = new ConcurrentLimitExceededError(10, 10);
      const response = error.getResponse() as { error: { message: string } };

      expect(response.error.message).toContain('Limit: 10');
    });
  });

  describe('RateLimitExceededError', () => {
    it('should have correct status and code', () => {
      const error = new RateLimitExceededError(60, 'minute');

      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.code).toBe(QuotaErrorCode.RATE_LIMIT_EXCEEDED);
    });

    it('should include limit and window in details', () => {
      const error = new RateLimitExceededError(100, 'hour');

      expect(error.details).toEqual({ limit: 100, window: 'hour' });
    });

    it('should format message correctly', () => {
      const error = new RateLimitExceededError(30, 'minute');
      const response = error.getResponse() as { error: { message: string } };

      expect(response.error.message).toContain('30 requests per minute');
    });
  });

  describe('Error inheritance', () => {
    it('all errors should extend QuotaError', () => {
      expect(new QuotaExceededError(0, 1)).toBeInstanceOf(QuotaError);
      expect(new QuotaNotFoundError('user')).toBeInstanceOf(QuotaError);
      expect(new QuotaAlreadyExistsError('user')).toBeInstanceOf(QuotaError);
      expect(new InvalidRefundError('reason')).toBeInstanceOf(QuotaError);
      expect(new InvalidQuotaAmountError(1)).toBeInstanceOf(QuotaError);
      expect(new InvalidPurchaseError('orderId is required')).toBeInstanceOf(
        QuotaError,
      );
      expect(new DuplicateRefundError('ss')).toBeInstanceOf(QuotaError);
      expect(new DuplicatePurchaseError('order')).toBeInstanceOf(QuotaError);
      expect(new ConcurrentLimitExceededError(1, 1)).toBeInstanceOf(QuotaError);
      expect(new RateLimitExceededError(1, 's')).toBeInstanceOf(QuotaError);
    });

    it('all errors should be throwable', () => {
      expect(() => {
        throw new QuotaExceededError(0, 1);
      }).toThrow(QuotaExceededError);

      expect(() => {
        throw new RateLimitExceededError(60, 'minute');
      }).toThrow(RateLimitExceededError);
    });
  });
});
