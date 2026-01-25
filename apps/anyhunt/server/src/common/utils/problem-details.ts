/**
 * [PROVIDES]: buildProblemDetails, normalizeValidationErrors, getRequestId
 * [DEPENDS]: express Request
 * [POS]: RFC7807 错误体构建与校验错误标准化
 *
 * [PROTOCOL]: 本文件变更时，请同步更新所属目录 CLAUDE.md
 */

import type { Request } from 'express';

const PROBLEM_TYPE_BASE = 'https://anyhunt.app/errors';

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

export type ValidationErrorItem = { field?: string; message: string };

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  requestId?: string;
  details?: unknown;
  errors?: ValidationErrorItem[];
};

export function getRequestId(request: Request): string | undefined {
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

export function normalizeValidationErrors(
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

export function buildProblemDetails(params: {
  status: number;
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
  errors?: ValidationErrorItem[];
}): ProblemDetails {
  const title = HTTP_STATUS_TITLES[params.status] || 'Error';
  return {
    type: `${PROBLEM_TYPE_BASE}/${params.code}`,
    title,
    status: params.status,
    detail: params.message,
    code: params.code,
    ...(params.requestId ? { requestId: params.requestId } : {}),
    ...(params.details !== undefined ? { details: params.details } : {}),
    ...(params.errors ? { errors: params.errors } : {}),
  };
}
