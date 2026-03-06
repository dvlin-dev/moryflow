/**
 * [PROVIDES]: Sources HTTP idempotency helpers
 * [DEPENDS]: express Request
 * [POS]: Sources controllers 的请求路径/响应描述辅助
 */

import type { Request } from 'express';

export function resolveSourcesRequestPath(request: Request): string {
  return request.originalUrl.split('?')[0] ?? request.originalUrl;
}

export function describeSourceObjectResponse(
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

export function describeSourceRevisionResult(response: unknown): {
  resourceType: string;
  resourceId?: string;
} {
  if (
    typeof response !== 'object' ||
    response === null ||
    typeof (response as { revision_id?: unknown }).revision_id !== 'string'
  ) {
    return { resourceType: 'source-revision' };
  }

  return {
    resourceType: 'source-revision',
    resourceId: (response as { revision_id: string }).revision_id,
  };
}
