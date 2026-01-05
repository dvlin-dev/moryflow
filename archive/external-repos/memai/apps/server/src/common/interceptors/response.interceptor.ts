/**
 * Response Interceptor
 * Automatically wraps controller responses in a unified format
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export const SKIP_RESPONSE_WRAP = 'skipResponseWrap';

/**
 * 分页元数据 - 与 @memai/shared-types 保持同步
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface PaginatedData {
  items: unknown[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

function isPaginatedData(data: unknown): data is PaginatedData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'items' in data &&
    'pagination' in data &&
    Array.isArray((data as PaginatedData).items)
  );
}

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

    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // 204 No Content - return undefined
        if (response.statusCode === 204) {
          return undefined;
        }

        // Already wrapped - skip to prevent double wrapping
        if (hasSuccessField(data)) {
          return data;
        }

        const timestamp = new Date().toISOString();

        // Paginated response: { items, pagination } -> { success, data, meta, timestamp }
        if (isPaginatedData(data)) {
          const { items, pagination } = data;
          return {
            success: true,
            data: items,
            meta: {
              total: pagination.total,
              limit: pagination.limit,
              offset: pagination.offset,
              hasMore: pagination.offset + items.length < pagination.total,
            },
            timestamp,
          };
        }

        // Standard response: data -> { success, data, timestamp }
        return {
          success: true,
          data,
          timestamp,
        };
      }),
    );
  }
}
