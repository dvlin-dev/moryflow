/**
 * AI Image Exception Filter
 * 统一处理 AI Image 模块的异常，返回 OpenAI 兼容格式
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AiImageException } from './exceptions';

@Catch()
export class AiImageExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AiImageExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 如果响应已经发送，不再处理
    if (response.headersSent) {
      this.logger.warn('Response already sent, cannot handle exception');
      return;
    }

    // AI Image 自定义异常
    if (exception instanceof AiImageException) {
      this.logger.warn(
        `[AiImageException] ${exception.errorCode}: ${exception.errorMessage}`,
      );
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    // NestJS HTTP 异常
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      this.logger.warn(
        `[HttpException] status=${status}, response=${JSON.stringify(exceptionResponse)}`,
      );

      // 如果已经是 OpenAI 格式，直接返回
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'error' in exceptionResponse
      ) {
        response.status(status).json(exceptionResponse);
        return;
      }

      // 转换为 OpenAI 格式
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string }).message ||
            'Request failed';

      response.status(status).json({
        error: {
          message,
          type: this.getErrorType(status),
          code: this.getErrorCode(status),
        },
      });
      return;
    }

    // 未知错误
    const errorMessage =
      exception instanceof Error
        ? exception.message
        : 'An unexpected error occurred';

    if (exception instanceof Error) {
      this.logger.error(
        `[UpstreamError] ${exception.name}: ${exception.message}`,
      );
      this.logger.error(`[UpstreamError] Stack: ${exception.stack}`);
    } else {
      this.logger.error('[UpstreamError] Unknown error type', exception);
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        message: errorMessage,
        type: 'api_error',
        code: 'internal_error',
      },
    });
  }

  private getErrorType(status: number): string {
    switch (status) {
      case 400:
        return 'invalid_request_error';
      case 401:
        return 'authentication_error';
      case 403:
        return 'permission_error';
      case 429:
        return 'rate_limit_error';
      default:
        return 'api_error';
    }
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'invalid_request';
      case 401:
        return 'invalid_api_key';
      case 403:
        return 'insufficient_quota';
      case 429:
        return 'rate_limit_exceeded';
      default:
        return 'internal_error';
    }
  }
}
