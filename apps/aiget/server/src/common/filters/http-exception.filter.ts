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
        code = HTTP_STATUS_CODES[status] || 'UNKNOWN_ERROR';
      } else if (typeof res === 'object') {
        const obj = res as Record<string, unknown>;

        // 处理已有标准格式的错误类（如 QuotaError, OembedError）
        // 这些类已经返回 { success: false, error: { code, message, details? } }
        if (obj.success === false && obj.error) {
          response.status(status).json({
            ...obj,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // 处理 NestJS 验证管道错误 / Zod 验证错误
        if (Array.isArray(obj.message)) {
          message = String(obj.message[0]);
          details = obj.message;
          code = 'VALIDATION_ERROR';
        } else if (obj.errors) {
          message = (obj.message as string) || 'Validation failed';
          details = obj.errors;
          code = 'VALIDATION_ERROR';
        } else {
          message = (obj.message as string) || 'Request failed';
          code = HTTP_STATUS_CODES[status] || 'UNKNOWN_ERROR';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `[${request.method} ${request.url}] Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
