/**
 * [DEFINES]: 配额模块自定义错误类
 * [USED_BY]: quota.service.ts, quota.repository.ts
 * [POS]: 错误边界，提供清晰的错误类型和错误码
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/** 配额错误码 */
export enum QuotaErrorCode {
  // 业务错误
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  QUOTA_NOT_FOUND = 'QUOTA_NOT_FOUND',
  QUOTA_ALREADY_EXISTS = 'QUOTA_ALREADY_EXISTS',
  INVALID_REFUND = 'INVALID_REFUND',
  DUPLICATE_REFUND = 'DUPLICATE_REFUND',

  // 并发错误
  CONCURRENT_LIMIT_EXCEEDED = 'CONCURRENT_LIMIT_EXCEEDED',

  // 频率错误
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/** 配额错误基类 */
export abstract class QuotaError extends HttpException {
  constructor(
    public readonly code: QuotaErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      {
        success: false,
        error: {
          code,
          message,
          details,
        },
      },
      status,
    );
  }
}

/** 配额不足错误 */
export class QuotaExceededError extends QuotaError {
  constructor(available: number, required: number) {
    super(
      QuotaErrorCode.QUOTA_EXCEEDED,
      `Quota exceeded. Available: ${available}, Required: ${required}`,
      HttpStatus.PAYMENT_REQUIRED,
      { available, required },
    );
  }
}

/** 配额记录不存在错误 */
export class QuotaNotFoundError extends QuotaError {
  constructor(userId: string) {
    super(
      QuotaErrorCode.QUOTA_NOT_FOUND,
      `Quota record not found for user`,
      HttpStatus.NOT_FOUND,
      { userId },
    );
  }
}

/** 配额记录已存在错误 */
export class QuotaAlreadyExistsError extends QuotaError {
  constructor(userId: string) {
    super(
      QuotaErrorCode.QUOTA_ALREADY_EXISTS,
      `Quota record already exists for user`,
      HttpStatus.CONFLICT,
      { userId },
    );
  }
}

/** 无效返还错误 */
export class InvalidRefundError extends QuotaError {
  constructor(reason: string) {
    super(
      QuotaErrorCode.INVALID_REFUND,
      `Invalid refund request: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { reason },
    );
  }
}

/** 重复返还错误 */
export class DuplicateRefundError extends QuotaError {
  constructor(screenshotId: string) {
    super(
      QuotaErrorCode.DUPLICATE_REFUND,
      `Refund already processed for this screenshot`,
      HttpStatus.CONFLICT,
      { screenshotId },
    );
  }
}

/** 并发限制错误 */
export class ConcurrentLimitExceededError extends QuotaError {
  constructor(limit: number, current: number) {
    super(
      QuotaErrorCode.CONCURRENT_LIMIT_EXCEEDED,
      `Too many concurrent requests. Limit: ${limit}`,
      HttpStatus.TOO_MANY_REQUESTS,
      { limit, current },
    );
  }
}

/** 频率限制错误 */
export class RateLimitExceededError extends QuotaError {
  constructor(limit: number, window: string) {
    super(
      QuotaErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Limit: ${limit} requests per ${window}`,
      HttpStatus.TOO_MANY_REQUESTS,
      { limit, window },
    );
  }
}
