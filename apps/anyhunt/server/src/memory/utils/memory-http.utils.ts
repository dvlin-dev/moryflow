/**
 * [PROVIDES]: Memory HTTP controller helper functions
 * [DEPENDS]: express Request
 * [POS]: Memory controllers 的幂等/请求路径/响应描述辅助
 */

import type { Request } from 'express';

export function resolveMemoryRequestPath(request: Request): string {
  return request.originalUrl.split('?')[0] ?? request.originalUrl;
}

export function describeObjectIdResponse(
  response: unknown,
  resourceType: string,
): { resourceType: string; resourceId?: string } {
  if (
    typeof response !== 'object' ||
    response === null ||
    typeof (response as { id?: unknown }).id !== 'string'
  ) {
    return { resourceType };
  }

  return {
    resourceType,
    resourceId: (response as { id: string }).id,
  };
}

export function describeCreateMemoryResponse(response: unknown): {
  resourceType: string;
  resourceId?: string;
} {
  const items: unknown[] = Array.isArray(response)
    ? response
    : typeof response === 'object' &&
        response !== null &&
        Array.isArray((response as { results?: unknown[] }).results)
      ? (response as { results: unknown[] }).results
      : [];
  const first = items[0];

  if (
    typeof first !== 'object' ||
    first === null ||
    typeof (first as { id?: unknown }).id !== 'string'
  ) {
    return { resourceType: 'memory' };
  }

  return {
    resourceType: 'memory',
    resourceId: (first as { id: string }).id,
  };
}
