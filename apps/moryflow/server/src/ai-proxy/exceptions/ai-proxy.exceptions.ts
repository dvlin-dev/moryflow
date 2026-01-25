/**
 * AI Proxy 自定义异常
 * 类型安全的错误处理，输出 RFC7807 所需字段
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/** OpenAI 错误类型 */
export type OpenAIErrorType =
  | 'invalid_request_error'
  | 'authentication_error'
  | 'permission_error'
  | 'rate_limit_error'
  | 'api_error'
  | 'insufficient_quota';

/** OpenAI 错误码 */
export type OpenAIErrorCode =
  | 'invalid_json'
  | 'model_not_found'
  | 'unsupported_provider'
  | 'insufficient_quota'
  | 'insufficient_credits'
  | 'internal_error'
  | 'stream_error'
  | 'image_generation_error'
  | 'content_policy_violation'
  | 'provider_unavailable';

/** AI Proxy 异常基类 */
export abstract class AiProxyException extends HttpException {
  constructor(
    public readonly errorMessage: string,
    public readonly errorType: OpenAIErrorType,
    public readonly errorCode: OpenAIErrorCode,
    status: HttpStatus,
  ) {
    super(
      { code: errorCode, message: errorMessage, details: { type: errorType } },
      status,
    );
  }
}

/** 模型未找到异常 */
export class ModelNotFoundException extends AiProxyException {
  constructor(modelId: string) {
    super(
      `Model not found: ${modelId}`,
      'invalid_request_error',
      'model_not_found',
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 不支持的 Provider 异常 */
export class UnsupportedProviderException extends AiProxyException {
  constructor(providerType: string) {
    super(
      `Unsupported provider type: ${providerType}`,
      'invalid_request_error',
      'unsupported_provider',
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** 模型权限不足异常 */
export class InsufficientModelPermissionException extends AiProxyException {
  constructor(userTier: string, modelId: string) {
    super(
      `User tier ${userTier} cannot use model ${modelId}. Please upgrade your plan.`,
      'permission_error',
      'insufficient_quota',
      HttpStatus.FORBIDDEN,
    );
  }
}

/** 积分不足异常 */
export class InsufficientCreditsException extends AiProxyException {
  constructor(required: number, available: number) {
    super(
      `Insufficient credits. Current balance: ${available}. Please top up to continue.`,
      'insufficient_quota',
      'insufficient_credits',
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

/** 欠费异常 */
export class OutstandingDebtException extends AiProxyException {
  constructor(debt: number) {
    super(
      `Outstanding balance: ${debt}. Please top up to continue.`,
      'insufficient_quota',
      'insufficient_credits',
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

/** 请求验证异常 */
export class InvalidRequestException extends AiProxyException {
  constructor(message: string) {
    super(
      message,
      'invalid_request_error',
      'invalid_json',
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** 流处理异常 */
export class StreamProcessingException extends AiProxyException {
  constructor(message: string) {
    super(
      message,
      'api_error',
      'stream_error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/** AI 服务内部错误 */
export class AiServiceException extends AiProxyException {
  constructor(message: string) {
    super(
      message,
      'api_error',
      'internal_error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
