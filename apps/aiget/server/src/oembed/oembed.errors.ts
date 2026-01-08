/**
 * oEmbed 错误类
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import { OembedErrorCode } from './oembed.constants';

/** oEmbed 错误基类 */
export abstract class OembedError extends HttpException {
  constructor(
    public readonly code: OembedErrorCode,
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
          ...(details && { details }),
        },
      },
      status,
    );
  }
}

/** URL 格式无效 */
export class InvalidUrlError extends OembedError {
  constructor(url: string, reason?: string) {
    super(
      OembedErrorCode.INVALID_URL,
      reason ?? 'Invalid URL format',
      HttpStatus.BAD_REQUEST,
      { url },
    );
  }
}

/** 资源未找到（上游 404） */
export class NotFoundError extends OembedError {
  constructor(url: string) {
    super(
      OembedErrorCode.NOT_FOUND,
      'Resource not found on provider',
      HttpStatus.NOT_FOUND,
      { url },
    );
  }
}

/** 不支持的 Provider */
export class UnsupportedProviderError extends OembedError {
  constructor(url: string) {
    super(
      OembedErrorCode.UNSUPPORTED_PROVIDER,
      'This URL is not supported',
      HttpStatus.BAD_REQUEST,
      { url },
    );
  }
}

/** Provider 返回错误 */
export class ProviderError extends OembedError {
  constructor(provider: string, reason: string, status?: number) {
    super(
      OembedErrorCode.PROVIDER_ERROR,
      `Provider error: ${reason}`,
      HttpStatus.BAD_GATEWAY,
      { provider, upstreamStatus: status },
    );
  }
}

/** 请求频率超限 */
export class RateLimitedError extends OembedError {
  constructor(retryAfter?: number) {
    super(
      OembedErrorCode.RATE_LIMITED,
      'Rate limit exceeded, please try again later',
      HttpStatus.TOO_MANY_REQUESTS,
      retryAfter ? { retryAfter } : undefined,
    );
  }
}

/** 不支持的格式 */
export class FormatNotSupportedError extends OembedError {
  constructor(format: string) {
    super(
      OembedErrorCode.FORMAT_NOT_SUPPORTED,
      `Format '${format}' is not supported, only JSON is available`,
      HttpStatus.NOT_IMPLEMENTED,
      { format, supported: ['json'] },
    );
  }
}

/** 请求超时 */
export class TimeoutError extends OembedError {
  constructor(provider: string, timeoutMs: number) {
    super(
      OembedErrorCode.TIMEOUT,
      `Request to ${provider} timed out`,
      HttpStatus.GATEWAY_TIMEOUT,
      { provider, timeoutMs },
    );
  }
}
