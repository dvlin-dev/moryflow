/**
 * [DEFINES]: API Key 模块自定义错误类
 * [USED_BY]: api-key.service.ts, api-key.controller.ts
 * [POS]: 错误边界，提供清晰的错误类型和错误码
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/** API Key 错误码 */
export enum ApiKeyErrorCode {
  API_KEY_NOT_FOUND = 'API_KEY_NOT_FOUND',
  API_KEY_EXPIRED = 'API_KEY_EXPIRED',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_KEY_LIMIT_EXCEEDED = 'API_KEY_LIMIT_EXCEEDED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
}

/** API Key 错误基类 */
export abstract class ApiKeyError extends HttpException {
  constructor(
    public readonly code: ApiKeyErrorCode,
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

/** API Key 不存在错误 */
export class ApiKeyNotFoundError extends ApiKeyError {
  constructor(id: string) {
    super(
      ApiKeyErrorCode.API_KEY_NOT_FOUND,
      `API key not found: ${id}`,
      HttpStatus.NOT_FOUND,
      { id },
    );
  }
}

/** API Key 已过期错误 */
export class ApiKeyExpiredError extends ApiKeyError {
  constructor(id: string) {
    super(
      ApiKeyErrorCode.API_KEY_EXPIRED,
      'API key has expired',
      HttpStatus.UNAUTHORIZED,
      { id },
    );
  }
}

/** API Key 无效错误 */
export class ApiKeyInvalidError extends ApiKeyError {
  constructor() {
    super(
      ApiKeyErrorCode.API_KEY_INVALID,
      'Invalid API key',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/** API Key 数量超限错误 */
export class ApiKeyLimitExceededError extends ApiKeyError {
  constructor(limit: number) {
    super(
      ApiKeyErrorCode.API_KEY_LIMIT_EXCEEDED,
      `Maximum ${limit} API keys allowed`,
      HttpStatus.BAD_REQUEST,
      { limit },
    );
  }
}

/** API Key 已撤销错误 */
export class ApiKeyRevokedError extends ApiKeyError {
  constructor(id: string) {
    super(
      ApiKeyErrorCode.API_KEY_REVOKED,
      'API key has been revoked',
      HttpStatus.UNAUTHORIZED,
      { id },
    );
  }
}
