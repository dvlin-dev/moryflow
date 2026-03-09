import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    setUser: vi.fn(),
    setModels: vi.fn(),
    setLoading: vi.fn(),
    setModelsLoading: vi.fn(),
    setMembershipEnabled: vi.fn(),
    models: [] as unknown[],
  };

  return {
    state,
    signInWithEmail: vi.fn(),
    startGoogleSignIn: vi.fn(),
    exchangeGoogleCode: vi.fn(),
    clearAuthSession: vi.fn(async () => undefined),
    startOAuthCallbackLoopback: vi.fn(),
    stopOAuthCallbackLoopback: vi.fn(async () => undefined),
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('../auth-api', () => ({
  signInWithEmail: mocks.signInWithEmail,
  startGoogleSignIn: mocks.startGoogleSignIn,
  exchangeGoogleCode: mocks.exchangeGoogleCode,
}));

vi.mock('../auth-session', () => ({
  clearAuthSession: mocks.clearAuthSession,
  ensureAccessToken: vi.fn(async () => true),
  getAccessToken: vi.fn(() => null),
  logoutFromServer: vi.fn(async () => undefined),
  shouldClearAuthSessionAfterEnsureFailure: vi.fn(async () => true),
}));

vi.mock('../api', () => ({
  fetchCurrentUser: vi.fn(async () => null),
  fetchMembershipModels: vi.fn(async () => ({ data: [] })),
  ServerApiError: class extends Error {
    isUnauthorized = false;
  },
}));

vi.mock('../auth-store', () => ({
  authStore: {
    getState: () => mocks.state,
  },
  waitForAuthHydration: vi.fn(async () => undefined),
}));

import { authMethods } from '../auth-methods';

describe('authMethods.loginWithGoogle', () => {
  const fixedNonce = '11111111-1111-4111-8111-111111111111';
  const cleanupMock = vi.fn();
  let callbackHandler: ((payload: { code: string; nonce: string }) => void) | null = null;
  const openExternalMock = vi.fn(async () => undefined);
  const onOAuthCallbackMock = vi.fn(
    (handler: (payload: { code: string; nonce: string }) => void) => {
      callbackHandler = handler;
      return cleanupMock;
    }
  );

  beforeEach(() => {
    mocks.startGoogleSignIn.mockReset();
    mocks.exchangeGoogleCode.mockReset();
    mocks.clearAuthSession.mockClear();
    mocks.startOAuthCallbackLoopback.mockReset();
    mocks.startOAuthCallbackLoopback.mockResolvedValue({
      callbackUrl: 'http://127.0.0.1:38971/auth/success',
    });
    mocks.stopOAuthCallbackLoopback.mockClear();
    cleanupMock.mockClear();
    callbackHandler = null;
    openExternalMock.mockReset();
    onOAuthCallbackMock.mockClear();

    mocks.state.setUser.mockClear();
    mocks.state.setModels.mockClear();
    mocks.state.setLoading.mockClear();
    mocks.state.setModelsLoading.mockClear();
    mocks.state.setMembershipEnabled.mockClear();
    mocks.state.models = [];

    Object.defineProperty(window, 'desktopAPI', {
      value: {
        membership: {
          openExternal: openExternalMock,
          onOAuthCallback: onOAuthCallbackMock,
          startOAuthCallbackLoopback: mocks.startOAuthCallbackLoopback,
          stopOAuthCallbackLoopback: mocks.stopOAuthCallbackLoopback,
        },
      },
      writable: true,
      configurable: true,
    });

    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(fixedNonce);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should establish session on successful google oauth exchange', async () => {
    mocks.startGoogleSignIn.mockResolvedValueOnce({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?state=demo',
    });
    mocks.exchangeGoogleCode.mockResolvedValueOnce({
      user: { id: 'u_google', email: 'google@example.com' },
    });
    vi.spyOn(authMethods, 'refresh').mockResolvedValueOnce(true);
    openExternalMock.mockImplementationOnce(async () => {
      callbackHandler?.({ code: 'code_ok', nonce: fixedNonce });
    });

    await expect(authMethods.loginWithGoogle()).resolves.toBeUndefined();

    expect(mocks.startOAuthCallbackLoopback).toHaveBeenCalledTimes(1);
    expect(mocks.startGoogleSignIn).toHaveBeenCalledWith(
      fixedNonce,
      'http://127.0.0.1:38971/auth/success'
    );
    expect(mocks.exchangeGoogleCode).toHaveBeenCalledWith('code_ok', fixedNonce);
    expect(openExternalMock).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth?state=demo'
    );
    expect(cleanupMock).toHaveBeenCalledTimes(1);
    expect(mocks.stopOAuthCallbackLoopback).toHaveBeenCalledTimes(1);
  });

  it('should fail when oauth callback nonce mismatches', async () => {
    mocks.startGoogleSignIn.mockResolvedValueOnce({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?state=demo',
    });
    openExternalMock.mockImplementationOnce(async () => {
      callbackHandler?.({ code: 'code_bad', nonce: 'nonce_other' });
    });

    await expect(authMethods.loginWithGoogle()).rejects.toThrow('Invalid oauth callback state');
    expect(mocks.exchangeGoogleCode).not.toHaveBeenCalled();
    expect(cleanupMock).toHaveBeenCalledTimes(1);
    expect(mocks.stopOAuthCallbackLoopback).toHaveBeenCalledTimes(1);
  });

  it('should clear pending state when exchange fails', async () => {
    mocks.startGoogleSignIn.mockResolvedValue({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?state=demo',
    });
    mocks.exchangeGoogleCode
      .mockResolvedValueOnce({
        error: {
          message: 'Exchange failed',
        },
      })
      .mockResolvedValueOnce({
        user: { id: 'u_google_2', email: 'google2@example.com' },
      });
    vi.spyOn(authMethods, 'refresh').mockResolvedValue(true);
    openExternalMock.mockImplementation(async () => {
      callbackHandler?.({ code: 'code_any', nonce: fixedNonce });
    });

    await expect(authMethods.loginWithGoogle()).rejects.toThrow('Exchange failed');
    await expect(authMethods.loginWithGoogle()).resolves.toBeUndefined();
    expect(mocks.startGoogleSignIn).toHaveBeenCalledTimes(2);
    expect(mocks.stopOAuthCallbackLoopback).toHaveBeenCalledTimes(2);
  });

  it('should cleanup oauth callback listener when openExternal fails', async () => {
    mocks.startGoogleSignIn.mockResolvedValueOnce({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?state=demo',
    });
    openExternalMock.mockRejectedValueOnce(new Error('open failed'));

    try {
      await expect(authMethods.loginWithGoogle()).rejects.toThrow('open failed');
      expect(cleanupMock).toHaveBeenCalledTimes(1);
      expect(mocks.stopOAuthCallbackLoopback).toHaveBeenCalledTimes(1);
    } finally {
      callbackHandler?.({ code: 'cleanup', nonce: fixedNonce });
    }
  });

  it('should fall back to deep link start when loopback redirect is rejected by server', async () => {
    mocks.startGoogleSignIn
      .mockResolvedValueOnce({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid oauth redirect uri',
        },
      })
      .mockResolvedValueOnce({
        url: 'https://accounts.google.com/o/oauth2/v2/auth?state=demo',
      });
    mocks.exchangeGoogleCode.mockResolvedValueOnce({
      user: { id: 'u_google', email: 'google@example.com' },
    });
    vi.spyOn(authMethods, 'refresh').mockResolvedValueOnce(true);
    openExternalMock.mockImplementationOnce(async () => {
      callbackHandler?.({ code: 'code_ok', nonce: fixedNonce });
    });

    await expect(authMethods.loginWithGoogle()).resolves.toBeUndefined();

    expect(mocks.startGoogleSignIn).toHaveBeenNthCalledWith(
      1,
      fixedNonce,
      'http://127.0.0.1:38971/auth/success'
    );
    expect(mocks.startGoogleSignIn).toHaveBeenNthCalledWith(2, fixedNonce);
    expect(openExternalMock).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth?state=demo'
    );
  });
});
