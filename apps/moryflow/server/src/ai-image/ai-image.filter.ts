/**
 * AI Image Exception Filter
 * 统一处理 AI Image 模块异常，返回 RFC7807
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AiImageException } from './exceptions';
import {
  buildProblemDetails,
  getRequestId,
  normalizeValidationErrors,
} from '../common/utils/problem-details';

const HTTP_STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  402: 'PAYMENT_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
};

@Catch()
export class AiImageExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AiImageExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // 如果响应已经发送，不再处理
    if (response.headersSent) {
      this.logger.warn('Response already sent, cannot handle exception');
      return;
    }

    // AI Image 自定义异常
    const requestId = getRequestId(request);

    if (exception instanceof AiImageException) {
      this.logger.warn(
        `[AiImageException] ${exception.errorCode}: ${exception.errorMessage}`,
      );
      const problem = buildProblemDetails({
        status: exception.getStatus(),
        code: exception.errorCode,
        message: exception.errorMessage,
        requestId,
        details: { type: exception.errorType },
      });
      response
        .status(exception.getStatus())
        .type('application/problem+json')
        .json(problem);
      return;
    }

    // NestJS HTTP 异常
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      this.logger.warn(
        `[HttpException] status=${status}, response=${JSON.stringify(exceptionResponse)}`,
      );

      const responseObj =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as Record<string, unknown>)
          : undefined;
      const errorObj =
        responseObj?.error && typeof responseObj.error === 'object'
          ? (responseObj.error as Record<string, unknown>)
          : undefined;
      const source = errorObj ?? responseObj ?? {};

      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (source as { message?: string }).message || 'Request failed';
      const code =
        typeof (source as { code?: unknown }).code === 'string'
          ? (source as { code: string }).code
          : HTTP_STATUS_CODES[status] || 'UNKNOWN_ERROR';
      const details =
        source && typeof source === 'object' && 'details' in source
          ? (source as { details?: unknown }).details
          : undefined;
      const validationErrors =
        normalizeValidationErrors(responseObj?.message) ??
        normalizeValidationErrors(responseObj?.errors);

      const problem = buildProblemDetails({
        status,
        code: validationErrors ? 'VALIDATION_ERROR' : code,
        message: validationErrors ? 'Validation failed' : message,
        requestId,
        details,
        errors: validationErrors,
      });

      response.status(status).type('application/problem+json').json(problem);
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

    const problem = buildProblemDetails({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: errorMessage,
      requestId,
    });

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .type('application/problem+json')
      .json(problem);
  }
}
