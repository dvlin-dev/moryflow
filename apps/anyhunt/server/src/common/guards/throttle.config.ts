/**
 * [PROVIDES]: 全局限流配置解析与路径跳过匹配
 * [DEPENDS]: ConfigService（环境变量）
 * [POS]: Nest Throttler 全局配置入口
 */

import type { ConfigService } from '@nestjs/config';

const DEFAULT_GLOBAL_THROTTLE_TTL_MS = 60_000;
const DEFAULT_GLOBAL_THROTTLE_LIMIT = 300;

const DEFAULT_GLOBAL_THROTTLE_SKIP_PATHS = [
  '/health',
  '/openapi.json',
  '/openapi-internal.json',
  '/api-reference',
] as const;

export type GlobalThrottleConfig = {
  ttlMs: number;
  limit: number;
  blockDurationMs: number;
  skipPaths: string[];
};

const normalizePath = (path: string): string => {
  const trimmed = path.trim();
  if (!trimmed) {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.slice(0, -1);
  }
  return withLeadingSlash;
};

const parsePositiveInt = (
  input: string | number | undefined,
  fallback: number,
  min = 1,
): number => {
  if (typeof input === 'number') {
    if (Number.isFinite(input) && input >= min) {
      return Math.floor(input);
    }
    return fallback;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return fallback;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed >= min) {
      return parsed;
    }
  }

  return fallback;
};

const parseSkipPaths = (
  rawValue: string | undefined,
  fallback: readonly string[],
): string[] => {
  if (rawValue === undefined) {
    return [...fallback];
  }

  if (!rawValue.trim()) {
    return [];
  }

  const deduped = new Set(
    rawValue
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => normalizePath(item))
      .filter(Boolean),
  );
  return [...deduped];
};

export const getGlobalThrottleConfig = (
  configService: ConfigService,
): GlobalThrottleConfig => {
  const ttlMs = parsePositiveInt(
    configService.get<string | number>('GLOBAL_THROTTLE_TTL_MS'),
    DEFAULT_GLOBAL_THROTTLE_TTL_MS,
    1,
  );
  const limit = parsePositiveInt(
    configService.get<string | number>('GLOBAL_THROTTLE_LIMIT'),
    DEFAULT_GLOBAL_THROTTLE_LIMIT,
    1,
  );
  const blockDurationMs = parsePositiveInt(
    configService.get<string | number>('GLOBAL_THROTTLE_BLOCK_DURATION_MS'),
    ttlMs,
    1,
  );
  const skipPaths = parseSkipPaths(
    configService.get<string>('GLOBAL_THROTTLE_SKIP_PATHS'),
    DEFAULT_GLOBAL_THROTTLE_SKIP_PATHS,
  );

  return {
    ttlMs,
    limit,
    blockDurationMs,
    skipPaths,
  };
};

export const shouldSkipGlobalThrottle = (
  pathname: string,
  skipPaths: readonly string[],
): boolean => {
  const normalizedPath = normalizePath(pathname.split('?')[0] ?? pathname);
  return skipPaths.some((skipPath) => {
    if (normalizedPath === skipPath) {
      return true;
    }
    return normalizedPath.startsWith(`${skipPath}/`);
  });
};
