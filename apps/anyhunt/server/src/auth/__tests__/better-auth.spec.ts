/**
 * Better Auth 配置测试
 */
import { describe, it, expect, vi } from 'vitest';
import { createBetterAuth, getAuthRateLimitConfig } from '../better-auth';
import type { PrismaClient } from '../../../generated/prisma-main/client';

const withEnv = async (
  env: Record<string, string | undefined>,
  run: () => Promise<void>,
) => {
  const snapshot = new Map<string, string | undefined>();
  for (const key of Object.keys(env)) {
    snapshot.set(key, process.env[key]);
    const value = env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    await run();
  } finally {
    for (const [key, value] of snapshot) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

describe('createBetterAuth', () => {
  it('should auto sign in after email verification', async () => {
    await withEnv(
      {
        BETTER_AUTH_SECRET: 'test-secret-should-be-long-enough-32+',
      },
      async () => {
        const auth = createBetterAuth(
          {} as PrismaClient,
          async () => undefined,
        );
        const context = await auth.$context;

        expect(
          context.options.emailVerification?.autoSignInAfterVerification,
        ).toBe(true);
      },
    );
  });

  it('should use auth rate limit defaults when env is missing', async () => {
    await withEnv(
      {
        BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS: undefined,
        BETTER_AUTH_RATE_LIMIT_MAX: undefined,
      },
      async () => {
        expect(getAuthRateLimitConfig()).toEqual({
          window: 60,
          max: 120,
        });
      },
    );
  });

  it('should allow overriding auth rate limit via env', async () => {
    await withEnv(
      {
        BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS: '30',
        BETTER_AUTH_RATE_LIMIT_MAX: '300',
      },
      async () => {
        expect(getAuthRateLimitConfig()).toEqual({
          window: 30,
          max: 300,
        });
      },
    );
  });

  it('should fallback auth rate limit when env is invalid', async () => {
    await withEnv(
      {
        BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS: '-1',
        BETTER_AUTH_RATE_LIMIT_MAX: 'not-a-number',
      },
      async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
          expect(getAuthRateLimitConfig()).toEqual({
            window: 60,
            max: 120,
          });
          expect(warnSpy).toHaveBeenCalled();
        } finally {
          warnSpy.mockRestore();
        }
      },
    );
  });

  it('should expose configured auth rate limit in Better Auth options', async () => {
    await withEnv(
      {
        BETTER_AUTH_SECRET: 'test-secret-should-be-long-enough-32+',
        BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS: '45',
        BETTER_AUTH_RATE_LIMIT_MAX: '180',
      },
      async () => {
        const auth = createBetterAuth(
          {} as PrismaClient,
          async () => undefined,
        );
        const context = await auth.$context;

        expect(context.options.rateLimit?.window).toBe(45);
        expect(context.options.rateLimit?.max).toBe(180);
      },
    );
  });
});
