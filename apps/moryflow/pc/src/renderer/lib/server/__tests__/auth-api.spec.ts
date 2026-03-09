import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn<typeof fetch>();

const mocks = vi.hoisted(() => ({
  syncAccessSessionFromPayload: vi.fn(),
  signUpEmail: vi.fn(),
  sendVerificationOtp: vi.fn(),
  signInWithEmail: vi.fn(),
  verifyEmailOTP: vi.fn(),
  exchangeGoogleCode: vi.fn(),
}));

vi.mock('../const', () => ({
  MEMBERSHIP_API_URL: 'https://server.test',
}));

vi.mock('../auth-session', () => ({
  syncAccessSessionFromPayload: mocks.syncAccessSessionFromPayload,
}));

vi.mock('../client', () => ({
  authClient: {
    signUp: {
      email: mocks.signUpEmail,
    },
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

const accessSessionPayload = () => ({
  accessToken: 'access',
  accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
});

describe('auth-api (desktop)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    mocks.syncAccessSessionFromPayload.mockReset();
    mocks.syncAccessSessionFromPayload.mockResolvedValue(true);
    mocks.signInWithEmail.mockReset();
    mocks.verifyEmailOTP.mockReset();
    mocks.exchangeGoogleCode.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    (window as unknown as { desktopAPI: unknown }).desktopAPI = {
      membership: {
        signInWithEmail: mocks.signInWithEmail,
        verifyEmailOTP: mocks.verifyEmailOTP,
        exchangeGoogleCode: mocks.exchangeGoogleCode,
      },
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('signInWithEmail should delegate token-bearing login to main process', async () => {
    const payload = accessSessionPayload();
    mocks.signInWithEmail.mockResolvedValueOnce({
      ok: true,
      payload,
      user: { id: 'u_1', email: 'demo@example.com' },
    });

    const { signInWithEmail } = await import('../auth-api');
    await signInWithEmail('demo@example.com', 'pass');

    expect(mocks.signInWithEmail).toHaveBeenCalledWith('demo@example.com', 'pass');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.syncAccessSessionFromPayload).toHaveBeenCalledWith(payload);
  });

  it('verifyEmailOTP should delegate token-bearing verification to main process', async () => {
    const payload = accessSessionPayload();
    mocks.verifyEmailOTP.mockResolvedValueOnce({
      ok: true,
      payload,
      user: { id: 'u_2', email: 'verify@example.com' },
    });

    const { verifyEmailOTP } = await import('../auth-api');
    await verifyEmailOTP('verify@example.com', '123456');

    expect(mocks.verifyEmailOTP).toHaveBeenCalledWith('verify@example.com', '123456');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.syncAccessSessionFromPayload).toHaveBeenCalledWith(payload);
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

  it('startGoogleSignIn should pass loopback redirect uri through start check and start url', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { startGoogleSignIn } = await import('../auth-api');
    const result = await startGoogleSignIn('nonce_fixed', 'http://127.0.0.1:38971/auth/success');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://server.test/api/v1/auth/social/google/start/check?nonce=nonce_fixed&redirectUri=http%3A%2F%2F127.0.0.1%3A38971%2Fauth%2Fsuccess'
    );
    expect(result).toEqual({
      url: 'https://server.test/api/v1/auth/social/google/start?nonce=nonce_fixed&redirectUri=http%3A%2F%2F127.0.0.1%3A38971%2Fauth%2Fsuccess',
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

  it('exchangeGoogleCode should delegate token-bearing exchange to main process', async () => {
    const payload = {
      accessToken: 'access_3',
      accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    mocks.exchangeGoogleCode.mockResolvedValueOnce({
      ok: true,
      payload,
      user: { id: 'u_3', email: 'oauth@example.com' },
    });

    const { exchangeGoogleCode } = await import('../auth-api');
    await exchangeGoogleCode('code_3', 'nonce_3');

    expect(mocks.exchangeGoogleCode).toHaveBeenCalledWith('code_3', 'nonce_3');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.syncAccessSessionFromPayload).toHaveBeenCalledWith(payload);
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
