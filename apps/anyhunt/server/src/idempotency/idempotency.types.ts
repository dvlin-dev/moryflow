/**
 * [DEFINES]: 幂等请求参数、状态与返回类型
 * [USED_BY]: idempotency.service.ts
 */

export interface BeginIdempotencyParams {
  scope: string;
  idempotencyKey: string;
  method: string;
  path: string;
  requestHash: string;
  ttlSeconds: number;
  retryFailedResponseStatusesGte?: number;
}

export interface CompleteIdempotencyParams {
  recordId: string;
  responseStatus: number;
  responseBody: unknown;
  resourceType?: string;
  resourceId?: string;
}

export interface FailIdempotencyParams {
  recordId: string;
  responseStatus?: number;
  responseBody?: unknown;
  errorCode?: string;
}

export type BeginIdempotencyResult =
  | { kind: 'started'; recordId: string }
  | {
      kind: 'replay';
      responseStatus: number;
      responseBody: unknown;
      resourceType?: string | null;
      resourceId?: string | null;
      errorCode?: string | null;
    }
  | { kind: 'processing' };
