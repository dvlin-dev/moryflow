/**
 * [INPUT]: 导航执行器 + RetryBudget + host
 * [OUTPUT]: 导航结果或分类后的导航错误
 * [POS]: Browser 导航重试与失败分类（仅网络类重试）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import type { RetryBudget } from '../policy';
import type { BrowserFailureClass } from '../observability/risk-contract';
import {
  BrowserNavigationRateLimitError,
  BrowserPolicyDeniedError,
} from '../policy';

export type NavigationFailureReason =
  | 'http_403'
  | 'http_429'
  | 'challenge'
  | 'timeout'
  | 'dns'
  | 'tls'
  | 'network'
  | 'script_error';

export class BrowserNavigationError extends Error {
  constructor(
    public readonly host: string,
    public readonly failureClass: BrowserFailureClass,
    public readonly reason: NavigationFailureReason,
    public readonly retryable: boolean,
    public readonly statusCode?: number,
  ) {
    super(buildNavigationErrorMessage(host, failureClass, reason));
    this.name = 'BrowserNavigationError';
  }
}

export interface NavigationRetryInput<T> {
  host: string;
  budget: RetryBudget;
  execute: (attempt: number) => Promise<T>;
}

export interface NavigationResultCheckInput {
  host: string;
  responseStatus: number | null;
  finalUrl: string;
  title: string | null;
}

@Injectable()
export class NavigationRetryService {
  async run<T>(input: NavigationRetryInput<T>): Promise<T> {
    const maxAttempts = Math.max(1, input.budget.maxAttempts);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await input.execute(attempt);
      } catch (error) {
        if (
          error instanceof BrowserPolicyDeniedError ||
          error instanceof BrowserNavigationRateLimitError
        ) {
          throw error;
        }

        const navigationError = this.classifyError(input.host, error);
        const shouldRetry =
          navigationError.failureClass === 'network' &&
          navigationError.retryable &&
          attempt < maxAttempts;

        if (!shouldRetry) {
          throw navigationError;
        }

        const delayMs = computeDelayMs(input.budget, attempt);
        await sleep(delayMs);
      }
    }

    throw new BrowserNavigationError(
      input.host,
      'network',
      'network',
      false,
      503,
    );
  }

  classifyResult(
    input: NavigationResultCheckInput,
  ): BrowserNavigationError | null {
    if (input.responseStatus === 403) {
      return new BrowserNavigationError(
        input.host,
        'access_control',
        'http_403',
        false,
        403,
      );
    }

    if (input.responseStatus === 429) {
      return new BrowserNavigationError(
        input.host,
        'access_control',
        'http_429',
        false,
        429,
      );
    }

    if (isChallengePage(input.finalUrl, input.title)) {
      return new BrowserNavigationError(
        input.host,
        'access_control',
        'challenge',
        false,
        403,
      );
    }

    return null;
  }

  classifyError(host: string, error: unknown): BrowserNavigationError {
    if (error instanceof BrowserNavigationError) {
      return error;
    }

    const message = extractErrorMessage(error).toLowerCase();
    if (isAccessControlError(message)) {
      const reason = message.includes('429') ? 'http_429' : 'http_403';
      const statusCode = reason === 'http_429' ? 429 : 403;
      return new BrowserNavigationError(
        host,
        'access_control',
        reason,
        false,
        statusCode,
      );
    }

    if (isNetworkError(message)) {
      const reason = classifyNetworkReason(message);
      return new BrowserNavigationError(host, 'network', reason, true, 503);
    }

    return new BrowserNavigationError(
      host,
      'script',
      'script_error',
      false,
      502,
    );
  }
}

const CHALLENGE_PATTERNS = [
  'captcha',
  'challenge',
  'verify you are human',
  'cf-chl',
  'attention required',
  'robot check',
];

const isChallengePage = (url: string, title: string | null): boolean => {
  const source = `${url} ${title ?? ''}`.toLowerCase();
  return CHALLENGE_PATTERNS.some((pattern) => source.includes(pattern));
};

const isAccessControlError = (message: string): boolean => {
  if (!message) return false;
  return (
    message.includes('403') ||
    message.includes('429') ||
    CHALLENGE_PATTERNS.some((pattern) => message.includes(pattern))
  );
};

const isNetworkError = (message: string): boolean => {
  if (!message) return false;
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('net::err_') ||
    message.includes('dns') ||
    message.includes('econn') ||
    message.includes('socket hang up') ||
    message.includes('tls') ||
    message.includes('ssl') ||
    message.includes('certificate')
  );
};

const classifyNetworkReason = (
  message: string,
): 'timeout' | 'dns' | 'tls' | 'network' => {
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }
  if (message.includes('dns') || message.includes('name not resolved')) {
    return 'dns';
  }
  if (
    message.includes('tls') ||
    message.includes('ssl') ||
    message.includes('certificate')
  ) {
    return 'tls';
  }
  return 'network';
};

const computeDelayMs = (budget: RetryBudget, attempt: number): number => {
  const base = Math.max(0, budget.baseDelayMs);
  const max = Math.max(base, budget.maxDelayMs);
  const factor = Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(max, base * factor);
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'unknown error';
};

const buildNavigationErrorMessage = (
  host: string,
  failureClass: BrowserFailureClass,
  reason: NavigationFailureReason,
): string => {
  if (failureClass === 'access_control') {
    if (reason === 'challenge') {
      return `Navigation challenge detected for host: ${host}`;
    }
    return `Navigation rejected by access control for host: ${host}`;
  }

  if (failureClass === 'network') {
    return `Navigation failed due to network issue for host: ${host}`;
  }

  return `Navigation failed due to script/runtime error for host: ${host}`;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
