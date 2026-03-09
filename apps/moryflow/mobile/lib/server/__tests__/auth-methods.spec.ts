import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    pendingSignup: null as { email: string; password: string } | null,
    isSubmitting: false,
  };

  return {
    state,
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    extractUser: vi.fn(),
    parseAuthError: vi.fn((error: { message?: string }) => error.message || 'Auth failed'),
    authStore: {
      getState: vi.fn(() => ({
        pendingSignup: state.pendingSignup,
        setUser: vi.fn(),
        clearMembershipState: vi.fn(),
        clearAccessToken: vi.fn(),
        setModelsLoading: vi.fn(),
        setModels: vi.fn(),
        setSubmitting: (value: boolean) => {
          state.isSubmitting = value;
        },
        setPendingSignup: (value: { email: string; password: string } | null) => {
          state.pendingSignup = value;
        },
      })),
    },
  };
});

vi.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  TurboModuleRegistry: {
    get: vi.fn(),
    getEnforcing: vi.fn(() => ({})),
  },
  NativeModules: {},
  Platform: {
    OS: 'ios',
    select: (value: Record<string, unknown>) => value.ios ?? value.default,
  },
}));

vi.mock('@moryflow/api', () => ({
  parseAuthError: mocks.parseAuthError,
}));

vi.mock('../storage', () => ({
  getStoredRefreshToken: vi.fn(),
  getStoredUserCache: vi.fn(),
  setStoredUserCache: vi.fn(),
  clearStoredUserCache: vi.fn(),
}));

vi.mock('@/lib/agent-runtime/membership-bridge', () => ({
  syncMembershipConfig: vi.fn(),
}));

vi.mock('../api', () => ({
  fetchCurrentUser: vi.fn(),
  fetchMembershipModels: vi.fn(),
  ServerApiError: class ServerApiError extends Error {
    isUnauthorized = false;
  },
}));

vi.mock('../auth-api', () => ({
  signInWithEmail: mocks.signInWithEmail,
  signUpWithEmail: mocks.signUpWithEmail,
  extractUser: mocks.extractUser,
}));

vi.mock('../auth-session', () => ({
  ensureAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  clearAuthSession: vi.fn(),
  shouldClearAuthSessionAfterEnsureFailure: vi.fn(),
  logoutFromServer: vi.fn(),
}));

vi.mock('../helper', () => ({
  createTempUserInfo: vi.fn(),
  convertApiModels: vi.fn(),
}));

vi.mock('../auth-store', () => ({
  authStore: mocks.authStore,
  waitForAuthHydration: vi.fn(),
}));

describe('authMethods.register', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('__DEV__', false);
    mocks.state.pendingSignup = null;
    mocks.state.isSubmitting = false;
    mocks.signInWithEmail.mockReset();
    mocks.signUpWithEmail.mockReset();
    mocks.extractUser.mockReset();
    mocks.parseAuthError.mockClear();
    mocks.signUpWithEmail.mockResolvedValue({
      user: { id: 'u_mobile_1', email: 'demo@example.com' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('stores pending signup after sign-up succeeds', async () => {
    const { authMethods } = await import('../auth-methods');

    await authMethods.register('  demo@example.com  ', 'secret-123', 'Demo');

    expect(mocks.signUpWithEmail).toHaveBeenCalledWith('demo@example.com', 'secret-123', 'Demo');
    expect(mocks.state.pendingSignup).toEqual({
      email: 'demo@example.com',
      password: 'secret-123',
    });
    expect(mocks.state.isSubmitting).toBe(false);
  });

  it('throws and does not persist pending signup when sign-up fails', async () => {
    mocks.signUpWithEmail.mockResolvedValueOnce({
      error: { code: 'SEND_FAILED', message: 'Failed to send code' },
    });

    const { authMethods } = await import('../auth-methods');

    await expect(
      authMethods.register('demo@example.com', 'secret-123', 'Demo')
    ).rejects.toMatchObject({
      name: 'AuthError',
      message: 'Failed to send code',
      code: 'SEND_FAILED',
    });
    expect(mocks.state.pendingSignup).toBeNull();
    expect(mocks.state.isSubmitting).toBe(false);
  });
});
