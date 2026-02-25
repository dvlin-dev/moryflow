/**
 * Request Logs 前端转换与错误文案工具
 */

import { ApiError } from '@/lib/api-client';

export function toIsoDateTimeOrUndefined(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

export function toStatusCodeOrUndefined(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed < 100 || parsed > 599) {
    return undefined;
  }

  return parsed;
}

export function getQueryErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return fallback;
}
