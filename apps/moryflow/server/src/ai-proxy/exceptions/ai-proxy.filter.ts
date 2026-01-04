/**
 * AI Proxy Exception Filter
 * 统一处理 AI Proxy 模块的异常，返回 OpenAI 兼容格式
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
import { AiProxyException } from './ai-proxy.exceptions';

@Catch()
export class AiProxyExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AiProxyExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 如果响应已经发送（流式场景），不再处理
    if (response.headersSent) {
      this.logger.warn('Response already sent, cannot handle exception');
      return;
    }

    // AI Proxy 自定义异常
    if (exception instanceof AiProxyException) {
      this.logger.warn(
        `[AiProxyException] ${exception.errorCode}: ${exception.errorMessage}`,
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

    // 未知错误（通常是上游服务商错误）
    const errorMessage =
      exception instanceof Error
        ? exception.message
        : 'An unexpected error occurred';

    // 详细记录上游错误信息，便于排查
    if (exception instanceof Error) {
      // AI SDK 错误可能包含额外属性，使用 in 检查安全提取
      const errorObj = exception as unknown as Record<string, unknown>;
      const errorDetails = {
        name: exception.name,
        message: exception.message,
        cause: 'cause' in errorObj ? errorObj.cause : undefined,
        data: 'data' in errorObj ? errorObj.data : undefined,
        statusCode: 'statusCode' in errorObj ? errorObj.statusCode : undefined,
        responseBody:
          'responseBody' in errorObj ? errorObj.responseBody : undefined,
      };
      this.logger.error(
        `[UpstreamError] ${exception.name}: ${exception.message}`,
        JSON.stringify(errorDetails, null, 2),
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
