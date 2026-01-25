/**
 * [INPUT]: HttpException / Unknown Error
 * [OUTPUT]: RFC7807 Problem Details
 * [POS]: Anyhunt Server 全局异常过滤器，统一错误响应
 *
 * [PROTOCOL]: 本文件变更时，请同步更新所属目录 CLAUDE.md
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  buildProblemDetails,
  getRequestId,
  normalizeValidationErrors,
} from '../utils/problem-details';

const HTTP_STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  402: 'PAYMENT_REQUIRED',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
  500: 'INTERNAL_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;
    let validationErrors:
      | ReturnType<typeof normalizeValidationErrors>
      | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        code = HTTP_STATUS_CODES[status] || 'UNKNOWN_ERROR';
      } else if (typeof res === 'object') {
        const obj = res as Record<string, unknown>;
        const errorObj =
          obj.error && typeof obj.error === 'object'
            ? (obj.error as Record<string, unknown>)
            : undefined;
        const source = errorObj ?? obj;

        if (typeof source.code === 'string') {
          code = source.code;
        } else {
          code = HTTP_STATUS_CODES[status] || 'UNKNOWN_ERROR';
        }

        if (typeof source.message === 'string') {
          message = source.message;
        } else if (typeof obj.message === 'string') {
          message = obj.message;
        } else {
          message = 'Request failed';
        }

        if (source.details !== undefined) {
          details = source.details;
        } else if (obj.details !== undefined) {
          details = obj.details;
        }

        // 处理 NestJS 验证管道错误 / Zod 验证错误
        validationErrors =
          normalizeValidationErrors(obj.message) ??
          normalizeValidationErrors(obj.errors);
        if (validationErrors) {
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${request.method} ${request.url}] Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    const requestId = getRequestId(request);
    const problem = buildProblemDetails({
      status,
      code,
      message,
      requestId,
      details,
      errors: validationErrors,
    });

    response.status(status).type('application/problem+json').json(problem);
  }
}
