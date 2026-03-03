/**
 * [INPUT]: 发送异常对象（Telegram API / 网络异常）
 * [OUTPUT]: DeliveryFailureClass + 重试决策
 * [POS]: 渠道发送可靠性统一分类器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { DeliveryFailureClass } from './types';

type ErrorLike = {
  code?: unknown;
  status?: unknown;
  response?: {
    error_code?: unknown;
    description?: unknown;
    status?: unknown;
  };
  description?: unknown;
  message?: unknown;
};

const toLowerText = (value: unknown): string =>
  typeof value === 'string' ? value.toLowerCase() : '';

const extractFailureContext = (error: unknown): { code?: number; text: string } => {
  if (!error || typeof error !== 'object') {
    return { text: '' };
  }

  const source = error as ErrorLike;
  const responseCode =
    typeof source.response?.error_code === 'number'
      ? source.response.error_code
      : typeof source.response?.status === 'number'
        ? source.response.status
        : undefined;
  const directCode =
    typeof source.code === 'number'
      ? source.code
      : typeof source.status === 'number'
        ? source.status
        : undefined;

  const text = [
    toLowerText(source.description),
    toLowerText(source.message),
    toLowerText(source.response?.description),
  ]
    .filter(Boolean)
    .join(' ');

  return {
    code: responseCode ?? directCode,
    text,
  };
};

export const classifyDeliveryFailure = (error: unknown): DeliveryFailureClass => {
  const context = extractFailureContext(error);

  if (
    context.text.includes('message thread not found') ||
    (context.text.includes('topic') && context.text.includes('not found'))
  ) {
    return 'fallback_threadless';
  }

  if (
    context.text.includes('parse entities') ||
    context.text.includes("can't parse") ||
    context.text.includes('unsupported start tag')
  ) {
    return 'fallback_plaintext';
  }

  if (
    context.code === 429 ||
    context.code === 408 ||
    context.code === 409 ||
    (typeof context.code === 'number' && context.code >= 500) ||
    context.text.includes('timed out') ||
    context.text.includes('econnreset') ||
    context.text.includes('network') ||
    context.text.includes('too many requests')
  ) {
    return 'retryable';
  }

  return 'non_retryable';
};

export const shouldRetryDelivery = (
  failure: DeliveryFailureClass,
  attempt: number,
  maxAttempts: number
): boolean => {
  if (failure !== 'retryable') {
    return false;
  }
  return attempt < maxAttempts;
};

export const computeRetryDelayMs = (attempt: number, baseMs = 400, maxMs = 4_000): number => {
  const exp = Math.max(0, attempt - 1);
  const delay = baseMs * 2 ** exp;
  return Math.min(delay, maxMs);
};
