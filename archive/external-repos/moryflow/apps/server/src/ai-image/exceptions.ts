/**
 * AI Image 模块异常定义
 * 独立的异常类，返回 OpenAI 兼容格式
 */

import { HttpException, HttpStatus } from '@nestjs/common';

// ==================== 类型定义 ====================

/** OpenAI 错误类型 */
export type OpenAIErrorType =
  | 'invalid_request_error'
  | 'permission_error'
  | 'api_error'
  | 'insufficient_quota';

/** OpenAI 错误码 */
export type OpenAIErrorCode =
  | 'invalid_json'
  | 'model_not_found'
  | 'unsupported_provider'
  | 'insufficient_quota'
  | 'insufficient_credits'
  | 'image_generation_error'
  | 'internal_error';

// ==================== 异常基类 ====================

/** AI Image 异常基类 */
export abstract class AiImageException extends HttpException {
  constructor(
    public readonly errorMessage: string,
    public readonly errorType: OpenAIErrorType,
    public readonly errorCode: OpenAIErrorCode,
    status: HttpStatus,
  ) {
    super(
      {
        error: {
          message: errorMessage,
          type: errorType,
          code: errorCode,
        },
      },
      status,
    );
  }
}

// ==================== 具体异常 ====================

/** 模型未找到异常 */
export class ModelNotFoundException extends AiImageException {
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
export class UnsupportedProviderException extends AiImageException {
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
export class InsufficientModelPermissionException extends AiImageException {
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
export class InsufficientCreditsException extends AiImageException {
  constructor(available: number) {
    super(
      `Insufficient credits. Current balance: ${available}. Please top up to continue.`,
      'insufficient_quota',
      'insufficient_credits',
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

/** 请求验证异常 */
export class InvalidRequestException extends AiImageException {
  constructor(message: string) {
    super(
      message,
      'invalid_request_error',
      'invalid_json',
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** 图片生成异常 */
export class ImageGenerationException extends AiImageException {
  constructor(
    message: string,
    code: OpenAIErrorCode = 'image_generation_error',
  ) {
    super(message, 'api_error', code, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
