import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn<typeof fetch>();

const mocks = vi.hoisted(() => ({
  syncAuthSessionFromPayload: vi.fn(),
  signUpEmail: vi.fn(),
  sendVerificationOtp: vi.fn(),
}));

vi.mock('../auth-client', () => ({
  AUTH_BASE_URL: 'https://server.test/api/v1/auth',
  authClient: {
    signUp: {
      email: mocks.signUpEmail,
    },
    emailOtp: {
      sendVerificationOtp: mocks.sendVerificationOtp,
    },
  },
}));

vi.mock('../auth-session', () => ({
  syncAuthSessionFromPayload: mocks.syncAuthSessionFromPayload,
}));

vi.mock('../auth-platform', () => ({
  DEVICE_PLATFORM: 'ios',
}));

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('auth-api (mobile)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    mocks.syncAuthSessionFromPayload.mockReset();
    mocks.syncAuthSessionFromPayload.mockResolvedValue(true);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('signInWithEmail should call /api/v1/auth/sign-in/email under auth base url', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'access',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshToken: 'refresh',
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        user: { id: 'u_1', email: 'demo@example.com' },
      })
    );

    const { signInWithEmail } = await import('../auth-api');
    await signInWithEmail('demo@example.com', 'pass');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://server.test/api/v1/auth/sign-in/email');
  });

  it('verifyEmailOTP should call /api/v1/auth/email-otp/verify-email under auth base url', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'access',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshToken: 'refresh',
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        user: { id: 'u_2', email: 'verify@example.com' },
      })
    );

    const { verifyEmailOTP } = await import('../auth-api');
    await verifyEmailOTP('verify@example.com', '123456');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://server.test/api/v1/auth/email-otp/verify-email'
    );
  });
});
