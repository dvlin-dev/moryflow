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
  if (typeof response !== 'object' || response === null) {
    return { resourceType };
  }

  const resourceId =
    typeof (response as { id?: unknown }).id === 'string'
      ? (response as { id: string }).id
      : typeof (response as { memory_export_id?: unknown }).memory_export_id ===
          'string'
        ? (response as { memory_export_id: string }).memory_export_id
        : undefined;

  if (!resourceId) {
    return { resourceType };
  }

  return {
    resourceType,
    resourceId,
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
