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

const isRateLimitModule = (
  value: unknown,
): value is { onRequestRateLimit: OnRequestRateLimit } => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = (value as Record<string, unknown>).onRequestRateLimit;
  return typeof candidate === 'function';
};

const loadOnRequestRateLimit = async (): Promise<OnRequestRateLimit> => {
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
  return importedModule.onRequestRateLimit;
};

describe('Auth rate limit behavior', () => {
  it('should return 429 on the 21st /sign-in/email request', async () => {
    const onRequestRateLimit = await loadOnRequestRateLimit();
    const rateLimitOptions = getBetterAuthRateLimitOptions();
    const customStore = new Map<string, RateLimitRecord>();
    const context = {
      rateLimit: {
        enabled: true,
        window: rateLimitOptions.window ?? 60,
        max: rateLimitOptions.max ?? 20,
        storage: 'secondary-storage',
        customRules: rateLimitOptions.customRules,
      },
      options: {
        basePath: '/api/auth',
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
      },
    };

    let blockedAt = 0;
    for (let i = 1; i <= 21; i += 1) {
      const request = new Request('http://localhost/api/auth/sign-in/email', {
        headers: {
          'x-forwarded-for': '127.0.0.1',
        },
      });
      const response = await onRequestRateLimit(request, context);
      if (response?.status === 429) {
        blockedAt = i;
        break;
      }
    }

    expect(blockedAt).toBe(21);
  });
});
