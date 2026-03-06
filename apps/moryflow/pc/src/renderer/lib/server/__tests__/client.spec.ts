import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAuthClient: vi.fn(() => ({}) as unknown),
  emailOTPClient: vi.fn(() => ({ name: 'email-otp-plugin' }) as unknown),
}));

vi.mock('better-auth/react', () => ({
  createAuthClient: mocks.createAuthClient,
}));

vi.mock('better-auth/client/plugins', () => ({
  emailOTPClient: mocks.emailOTPClient,
}));

vi.mock('../const', () => ({
  MEMBERSHIP_API_URL: 'https://server.test/',
}));

describe('auth client (desktop)', () => {
  it('should build Better Auth baseURL with /api/v1/auth prefix', async () => {
    await import('../client');

    expect(mocks.createAuthClient).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://server.test/api/v1/auth',
      })
    );
  });
});
