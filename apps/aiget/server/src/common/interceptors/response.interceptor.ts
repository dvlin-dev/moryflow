import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';

export const SKIP_RESPONSE_WRAP = 'skipResponseWrap';

/**
 * 检查是否已经是标准响应格式
 * 避免双重包装
 */
function hasSuccessField(data: unknown): boolean {
  return data !== null && typeof data === 'object' && 'success' in data;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAP, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown) => {
        // 204 No Content
        if (response.statusCode === 204) {
          return undefined;
        }

        // 已经是标准格式 - 跳过避免双重包装
        if (hasSuccessField(data)) {
          return data;
        }

        // 统一包装: data -> { success, data, timestamp }
        // 保留原始数据结构 (包括 { items, pagination } 分页格式)
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
