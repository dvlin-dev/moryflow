/**
 * HTTP Exception Filter
 * Catches all exceptions and returns a unified error format
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
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
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

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        const obj = res as Record<string, unknown>;
        // Handle NestJS validation pipe errors
        if (Array.isArray(obj.message)) {
          message = obj.message[0];
          details = obj.message;
        } else {
          message = (obj.message as string) || exception.message;
          details = obj.details;
        }
      }

      code = HTTP_STATUS_CODES[status] || 'UNKNOWN_ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `[${request.method} ${request.url}] Unhandled error: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `[${request.method} ${request.url}] Unknown exception: ${String(exception)}`,
      );
    }

    const errorResponse: { code: string; message: string; details?: unknown } = {
      code,
      message,
    };

    if (details !== undefined) {
      errorResponse.details = details;
    }

    response.status(status).json({
      success: false,
      error: errorResponse,
      timestamp: new Date().toISOString(),
    });
  }
}
