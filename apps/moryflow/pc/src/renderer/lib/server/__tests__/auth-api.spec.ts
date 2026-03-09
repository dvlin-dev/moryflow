import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn<typeof fetch>();

const mocks = vi.hoisted(() => ({
  syncAuthSessionFromPayload: vi.fn(),
  sendVerificationOtp: vi.fn(),
}));

vi.mock('../const', () => ({
  MEMBERSHIP_API_URL: 'https://server.test',
}));

vi.mock('../auth-session', () => ({
  syncAuthSessionFromPayload: mocks.syncAuthSessionFromPayload,
}));

vi.mock('../client', () => ({
  authClient: {
    emailOtp: {
      sendVerificationOtp: mocks.sendVerificationOtp,
    },
  },
}));

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('auth-api (desktop)', () => {
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

  it('signInWithEmail should call /api/v1/auth/sign-in/email under membership host', async () => {
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

  it('startEmailSignUp should call /api/v1/auth/sign-up/email/start under membership host', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    const { startEmailSignUp } = await import('../auth-api');
    await startEmailSignUp('verify@example.com');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://server.test/api/v1/auth/sign-up/email/start'
    );
  });

  it('verifyEmailSignUpOTP should call /api/v1/auth/sign-up/email/verify-otp under membership host', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        signupToken: 'signup_token_1',
        signupTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      })
    );

    const { verifyEmailSignUpOTP } = await import('../auth-api');
    await verifyEmailSignUpOTP('verify@example.com', '123456');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://server.test/api/v1/auth/sign-up/email/verify-otp'
    );
  });

  it('completeEmailSignUp should call /api/v1/auth/sign-up/email/complete and sync token session', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'access',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshToken: 'refresh',
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        user: { id: 'u_2', email: 'verify@example.com' },
      })
    );

    const { completeEmailSignUp } = await import('../auth-api');
    await completeEmailSignUp('signup_token_1', 'new-password');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://server.test/api/v1/auth/sign-up/email/complete'
    );
    expect(mocks.syncAuthSessionFromPayload).toHaveBeenCalledTimes(1);
  });

  it('startGoogleSignIn should perform start check before returning oauth url', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { startGoogleSignIn } = await import('../auth-api');
    const result = await startGoogleSignIn('nonce_fixed');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://server.test/api/v1/auth/social/google/start/check?nonce=nonce_fixed'
    );
    expect(result).toEqual({
      url: 'https://server.test/api/v1/auth/social/google/start?nonce=nonce_fixed',
    });
  });

  it('startGoogleSignIn should return immediate error when start check fails', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          detail: 'Google provider is not configured',
          code: 'SERVICE_UNAVAILABLE',
        },
        503
      )
    );
    const { startGoogleSignIn } = await import('../auth-api');
    const result = await startGoogleSignIn('nonce_error');

    expect(result).toEqual({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Google provider is not configured',
      },
    });
  });

  it('exchangeGoogleCode should call social/google/exchange and sync token session', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'access_3',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshToken: 'refresh_3',
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        user: { id: 'u_3', email: 'oauth@example.com' },
      })
    );

    const { exchangeGoogleCode } = await import('../auth-api');
    await exchangeGoogleCode('code_3', 'nonce_3');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://server.test/api/v1/auth/social/google/exchange'
    );
    expect(mocks.syncAuthSessionFromPayload).toHaveBeenCalledTimes(1);
  });

  it('sendForgotPasswordOTP should call /api/v1/auth/forget-password/email-otp under membership host', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    const { sendForgotPasswordOTP } = await import('../auth-api');
    await sendForgotPasswordOTP('forgot@example.com');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://server.test/api/v1/auth/forget-password/email-otp'
    );
  });

  it('resetPasswordWithOTP should call /api/v1/auth/email-otp/reset-password under membership host', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    const { resetPasswordWithOTP } = await import('../auth-api');
    await resetPasswordWithOTP('forgot@example.com', '123456', 'new-password');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://server.test/api/v1/auth/email-otp/reset-password'
    );
  });
});
