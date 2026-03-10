import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    isSubmitting: false,
  };

  return {
    state,
    signInWithEmail: vi.fn(),
    startEmailSignUp: vi.fn(),
    verifyEmailSignUpOTP: vi.fn(),
    completeEmailSignUp: vi.fn(),
    extractUser: vi.fn(),
    parseAuthError: vi.fn((error: { message?: string }) => error.message || 'Auth failed'),
    fetchCurrentUser: vi.fn(),
    authStore: {
      getState: vi.fn(() => ({
        setUser: vi.fn(),
        clearMembershipState: vi.fn(),
        clearAccessToken: vi.fn(),
        setModelsLoading: vi.fn(),
        setModels: vi.fn(),
        setSubmitting: (value: boolean) => {
          state.isSubmitting = value;
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
  fetchCurrentUser: mocks.fetchCurrentUser,
  fetchMembershipModels: vi.fn(),
  ServerApiError: class ServerApiError extends Error {
    isUnauthorized = false;
  },
}));

vi.mock('../auth-api', () => ({
  signInWithEmail: mocks.signInWithEmail,
  startEmailSignUp: mocks.startEmailSignUp,
  verifyEmailSignUpOTP: mocks.verifyEmailSignUpOTP,
  completeEmailSignUp: mocks.completeEmailSignUp,
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
    mocks.state.isSubmitting = false;
    mocks.signInWithEmail.mockReset();
    mocks.startEmailSignUp.mockReset();
    mocks.verifyEmailSignUpOTP.mockReset();
    mocks.completeEmailSignUp.mockReset();
    mocks.extractUser.mockReset();
    mocks.fetchCurrentUser.mockReset();
    mocks.parseAuthError.mockClear();
    mocks.startEmailSignUp.mockResolvedValue({});
    mocks.verifyEmailSignUpOTP.mockResolvedValue({
      signupToken: 'signup-token',
      signupTokenExpiresAt: '2030-01-01T00:10:00.000Z',
    });
    mocks.completeEmailSignUp.mockResolvedValue({
      user: { id: 'u_mobile_1', email: 'demo@example.com' },
    });
    mocks.fetchCurrentUser.mockResolvedValue({
      id: 'u_mobile_1',
      email: 'demo@example.com',
      name: 'Demo',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('starts email sign-up after trimming the email', async () => {
    const { authMethods } = await import('../auth-methods');

    await authMethods.register('  demo@example.com  ');

    expect(mocks.startEmailSignUp).toHaveBeenCalledWith('demo@example.com');
    expect(mocks.state.isSubmitting).toBe(false);
  });

  it('throws when start email sign-up fails', async () => {
    mocks.startEmailSignUp.mockResolvedValueOnce({
      error: { code: 'SEND_FAILED', message: 'Failed to send code' },
    });

    const { authMethods } = await import('../auth-methods');

    await expect(authMethods.register('demo@example.com')).rejects.toMatchObject({
      name: 'AuthError',
      message: 'Failed to send code',
      code: 'SEND_FAILED',
    });
    expect(mocks.state.isSubmitting).toBe(false);
  });

  it('completes sign-up and refreshes the user snapshot', async () => {
    const { authMethods } = await import('../auth-methods');

    await authMethods.completeEmailSignUp('signup-token', 'secret-123');

    expect(mocks.completeEmailSignUp).toHaveBeenCalledWith('signup-token', 'secret-123');
    expect(mocks.fetchCurrentUser).toHaveBeenCalledTimes(1);
    expect(mocks.state.isSubmitting).toBe(false);
  });
});
