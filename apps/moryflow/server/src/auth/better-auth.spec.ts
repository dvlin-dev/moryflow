import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  betterAuth: vi.fn((options: unknown) => options),
  prismaAdapter: vi.fn(() => ({ provider: 'postgresql' })),
  emailOTP: vi.fn((options: unknown) => ({ id: 'email-otp', options })),
}));

vi.mock('better-auth', () => ({
  betterAuth: mocks.betterAuth,
  APIError: class APIError extends Error {},
}));

vi.mock('@better-auth/expo', () => ({
  expo: () => ({ id: 'expo' }),
}));

vi.mock('better-auth/plugins/email-otp', () => ({
  emailOTP: mocks.emailOTP,
}));

vi.mock('better-auth/plugins/jwt', () => ({
  jwt: (options: unknown) => ({ id: 'jwt', options }),
}));

vi.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: mocks.prismaAdapter,
}));

import { createBetterAuth } from './better-auth';

const REQUIRED_SECRET = 'test-better-auth-key-min-32-1234567890';
const noopSendOtp = () => Promise.resolve();

const setBaseEnv = () => {
  process.env.BETTER_AUTH_SECRET = REQUIRED_SECRET;
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.TRUSTED_ORIGINS = 'http://localhost:3000,moryflow://';
};

describe('createBetterAuth', () => {
  beforeEach(() => {
    mocks.betterAuth.mockClear();
    mocks.prismaAdapter.mockClear();
    mocks.emailOTP.mockClear();
    setBaseEnv();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  afterEach(() => {
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.BETTER_AUTH_URL;
    delete process.env.TRUSTED_ORIGINS;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  it('should configure Better Auth basePath as /api/v1/auth', () => {
    createBetterAuth({} as never, noopSendOtp);

    const options = mocks.betterAuth.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(options?.basePath).toBe('/api/v1/auth');
  });

  it('should enable google social provider when env is configured', () => {
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-client-key';

    createBetterAuth({} as never, noopSendOtp);

    const options = mocks.betterAuth.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(options?.socialProviders).toMatchObject({
      google: {
        clientId: 'google-client-id',
        clientSecret: 'google-client-key',
        prompt: 'select_account',
      },
    });
  });

  it('should not configure google social provider without env', () => {
    createBetterAuth({} as never, noopSendOtp);

    const options = mocks.betterAuth.mock.calls[0]?.[0] as
      | {
          socialProviders?: {
            google?: unknown;
          };
        }
      | undefined;
    expect(options?.socialProviders?.google).toBeUndefined();
  });

  it('should disable implicit otp send on sign-up and rely on managed otp delivery', () => {
    createBetterAuth({} as never, noopSendOtp);

    const emailOtpOptions = mocks.emailOTP.mock.calls[0]?.[0] as
      | {
          sendVerificationOnSignUp?: boolean;
          overrideDefaultEmailVerification?: boolean;
        }
      | undefined;

    expect(emailOtpOptions?.sendVerificationOnSignUp).toBe(false);
    expect(emailOtpOptions?.overrideDefaultEmailVerification).toBe(false);
  });

  it('should pin Better Auth email/password minimum length for managed recovery flows', () => {
    createBetterAuth({} as never, noopSendOtp);

    const config = mocks.betterAuth.mock.calls[0]?.[0] as
      | {
          emailAndPassword?: {
            minPasswordLength?: number;
          };
        }
      | undefined;

    expect(config?.emailAndPassword?.minPasswordLength).toBe(8);
  });
});
