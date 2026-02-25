import { afterEach, describe, expect, it } from 'vitest';
import { getBetterAuthRateLimitOptions } from './auth.config';

const WINDOW_ENV_KEY = 'BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS';
const MAX_ENV_KEY = 'BETTER_AUTH_RATE_LIMIT_MAX';

const originalWindow = process.env[WINDOW_ENV_KEY];
const originalMax = process.env[MAX_ENV_KEY];

const restoreEnv = () => {
  if (originalWindow === undefined) {
    delete process.env[WINDOW_ENV_KEY];
  } else {
    process.env[WINDOW_ENV_KEY] = originalWindow;
  }

  if (originalMax === undefined) {
    delete process.env[MAX_ENV_KEY];
  } else {
    process.env[MAX_ENV_KEY] = originalMax;
  }
};

afterEach(() => {
  restoreEnv();
});

describe('auth rate limit config', () => {
  it('should use default values when env is missing', () => {
    delete process.env[WINDOW_ENV_KEY];
    delete process.env[MAX_ENV_KEY];

    const options = getBetterAuthRateLimitOptions();
    expect(options.window).toBe(60);
    expect(options.max).toBe(20);
    expect(options.enabled).toBe(true);
    expect(options.customRules).toMatchObject({
      '/sign-in/**': { window: 60, max: 20 },
      '/sign-up/**': { window: 60, max: 20 },
      '/change-password/**': { window: 60, max: 20 },
      '/change-email/**': { window: 60, max: 20 },
      '/email-otp/**': { window: 60, max: 20 },
      '/forget-password/**': { window: 60, max: 20 },
    });
  });

  it('should respect env values when valid', () => {
    process.env[WINDOW_ENV_KEY] = '120';
    process.env[MAX_ENV_KEY] = '35';

    const options = getBetterAuthRateLimitOptions();
    expect(options.window).toBe(120);
    expect(options.max).toBe(35);
    expect(options.customRules).toMatchObject({
      '/sign-in/**': { window: 120, max: 35 },
    });
  });

  it('should fallback to defaults when env values are invalid', () => {
    process.env[WINDOW_ENV_KEY] = '0';
    process.env[MAX_ENV_KEY] = '-5';

    const options = getBetterAuthRateLimitOptions();
    expect(options.window).toBe(60);
    expect(options.max).toBe(20);
  });
});
