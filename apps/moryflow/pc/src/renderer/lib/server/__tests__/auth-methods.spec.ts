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
    clearAuthSession: vi.fn(async () => undefined),
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('../auth-api', () => ({
  signInWithEmail: mocks.signInWithEmail,
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

describe('authMethods.login', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mocks.signInWithEmail.mockReset();
    mocks.clearAuthSession.mockClear();
    mocks.state.setUser.mockClear();
    mocks.state.setModels.mockClear();
    mocks.state.setLoading.mockClear();
    mocks.state.setModelsLoading.mockClear();
    mocks.state.setMembershipEnabled.mockClear();
    mocks.state.models = [];
  });

  it('clears session and throws when refresh cannot establish session', async () => {
    mocks.signInWithEmail.mockResolvedValue({
      user: { id: 'u_1', email: 'demo@example.com' },
    });
    vi.spyOn(authMethods, 'refresh').mockResolvedValueOnce(false);

    await expect(authMethods.login('demo@example.com', 'pass')).rejects.toThrow(
      'Failed to establish session'
    );

    expect(mocks.clearAuthSession).toHaveBeenCalledTimes(1);
    expect(mocks.state.setUser).toHaveBeenCalledWith(null);
    expect(mocks.state.setModels).toHaveBeenCalledWith([]);
  });

  it('does not clear session when refresh establishes session', async () => {
    mocks.signInWithEmail.mockResolvedValue({
      user: { id: 'u_2', email: 'ok@example.com' },
    });
    vi.spyOn(authMethods, 'refresh').mockResolvedValueOnce(true);

    await expect(authMethods.login('ok@example.com', 'pass')).resolves.toBeUndefined();
    expect(mocks.clearAuthSession).not.toHaveBeenCalled();
  });
});
