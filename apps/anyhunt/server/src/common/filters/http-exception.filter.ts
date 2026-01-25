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

const HTTP_STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Validation Error',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

type ValidationErrorItem = { field?: string; message: string };

const PROBLEM_TYPE_BASE = 'https://anyhunt.app/errors';

function getRequestId(request: Request): string | undefined {
  const requestId = (request as Request & { requestId?: string }).requestId;
  if (typeof requestId === 'string' && requestId.trim().length > 0) {
    return requestId;
  }
  const header = request.headers['x-request-id'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header;
  }
  if (Array.isArray(header) && header.length > 0) {
    return header[0];
  }
  return undefined;
}

function normalizeValidationErrors(
  value: unknown,
): ValidationErrorItem[] | undefined {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    const errors = value
      .map((entry) => {
        if (typeof entry === 'string') {
          return { message: entry };
        }
        if (entry && typeof entry === 'object') {
          const record = entry as Record<string, unknown>;
          const message =
            typeof record.message === 'string'
              ? record.message
              : 'Validation error';
          const field =
            typeof record.field === 'string'
              ? record.field
              : Array.isArray(record.path)
                ? record.path.join('.')
                : typeof record.path === 'string'
                  ? record.path
                  : undefined;
          return { field, message };
        }
        return null;
      })
      .filter((item): item is ValidationErrorItem => Boolean(item));
    return errors.length > 0 ? errors : undefined;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.errors)) {
      return normalizeValidationErrors(record.errors);
    }
    if (Array.isArray(record.issues)) {
      return normalizeValidationErrors(record.issues);
    }
    if (record.fieldErrors && typeof record.fieldErrors === 'object') {
      const fieldErrors = record.fieldErrors as Record<string, unknown>;
      const errors = Object.entries(fieldErrors)
        .flatMap(([field, messages]) => {
          if (Array.isArray(messages)) {
            return messages
              .filter((message) => typeof message === 'string')
              .map((message) => ({ field, message }));
          }
          return [];
        })
        .filter(Boolean);
      return errors.length > 0 ? errors : undefined;
    }
  }

  return undefined;
}

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
    let validationErrors: ValidationErrorItem[] | undefined;

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
      message = exception.message;
      this.logger.error(
        `[${request.method} ${request.url}] Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    const requestId = getRequestId(request);
    const title = HTTP_STATUS_TITLES[status] || 'Error';

    const problem: Record<string, unknown> = {
      type: `${PROBLEM_TYPE_BASE}/${code}`,
      title,
      status,
      detail: message,
      code,
      ...(requestId ? { requestId } : {}),
      ...(details !== undefined ? { details } : {}),
      ...(validationErrors ? { errors: validationErrors } : {}),
    };

    response.status(status).type('application/problem+json').json(problem);
  }
}
