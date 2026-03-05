import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getBetterAuthRateLimitOptions } from './auth.config';

type RateLimitRecord = {
  key: string;
  count: number;
  lastRequest: number;
};

type OnRequestRateLimit = (
  request: Request,
  ctx: Record<string, unknown>,
) => Promise<Response | void>;

type OnResponseRateLimit = (
  request: Request,
  ctx: Record<string, unknown>,
) => Promise<void>;

const isRateLimitModule = (
  value: unknown,
): value is {
  onRequestRateLimit: OnRequestRateLimit;
  onResponseRateLimit: OnResponseRateLimit;
} => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = (value as Record<string, unknown>).onRequestRateLimit;
  const responseCandidate = (value as Record<string, unknown>)
    .onResponseRateLimit;
  return (
    typeof candidate === 'function' && typeof responseCandidate === 'function'
  );
};

const loadRateLimitHandlers = async (): Promise<{
  onRequestRateLimit: OnRequestRateLimit;
  onResponseRateLimit: OnResponseRateLimit;
}> => {
  const betterAuthEntryPath = require.resolve('better-auth');
  const modulePath = join(
    dirname(betterAuthEntryPath),
    'api',
    'rate-limiter',
    'index.mjs',
  );
  const moduleUrl = pathToFileURL(modulePath).href;
  const importedModule: unknown = await import(/* @vite-ignore */ moduleUrl);
  if (!isRateLimitModule(importedModule)) {
    throw new Error('Failed to load Better Auth onRequestRateLimit handler');
  }
  return {
    onRequestRateLimit: importedModule.onRequestRateLimit,
    onResponseRateLimit: importedModule.onResponseRateLimit,
  };
};

describe('Auth rate limit behavior', () => {
  it('should return 429 on the 21st /sign-in/email request', async () => {
    const { onRequestRateLimit, onResponseRateLimit } =
      await loadRateLimitHandlers();
    const rateLimitOptions = getBetterAuthRateLimitOptions();
    const customStore = new Map<string, RateLimitRecord>();
    const context = {
      baseURL: 'http://localhost',
      rateLimit: {
        enabled: true,
        window: rateLimitOptions.window ?? 60,
        max: rateLimitOptions.max ?? 20,
        storage: 'secondary-storage',
        customRules: rateLimitOptions.customRules,
      },
      options: {
        basePath: '/api/v1/auth',
        plugins: [],
        advanced: {
          ipAddress: {
            ipAddressHeaders: ['x-forwarded-for'],
          },
        },
        secondaryStorage: {},
        rateLimit: {
          customStorage: {
            get: (key: string) => Promise.resolve(customStore.get(key)),
            set: (key: string, value: RateLimitRecord) => {
              customStore.set(key, value);
              return Promise.resolve();
            },
          },
        },
      },
      adapter: {},
      logger: {
        error: () => undefined,
        warn: () => undefined,
      },
    };

    let blockedAt = 0;
    for (let i = 1; i <= 21; i += 1) {
      const request = new Request(
        'http://localhost/api/v1/auth/sign-in/email',
        {
          headers: {
            'x-forwarded-for': '127.0.0.1',
          },
        },
      );
      const response = await onRequestRateLimit(request, context);
      if (response?.status === 429) {
        blockedAt = i;
        break;
      }
      await onResponseRateLimit(request, context);
    }

    expect(blockedAt).toBe(21);
  });
});
