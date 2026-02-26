import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bootstrapAuth,
  ensureAccessToken,
  refreshAccessToken,
  signIn,
  logout,
} from './auth-methods';
import { useAuthStore, type AuthUser } from '@/stores/auth';

const refreshByTokenMock = vi.fn();
const fetchCurrentUserMock = vi.fn();
const signInWithEmailMock = vi.fn();
const logoutByTokenMock = vi.fn();

vi.mock('./auth-api', () => ({
  fetchCurrentUser: (...args: unknown[]) => fetchCurrentUserMock(...args),
  logoutByToken: (...args: unknown[]) => logoutByTokenMock(...args),
  refreshByToken: (...args: unknown[]) => refreshByTokenMock(...args),
  signInWithEmail: (...args: unknown[]) => signInWithEmailMock(...args),
}));

const futureIso = (ms: number) => new Date(Date.now() + ms).toISOString();
const pastIso = (ms: number) => new Date(Date.now() - ms).toISOString();

const ADMIN_USER: AuthUser = {
  id: 'admin-1',
  email: 'admin@anyhunt.app',
  name: null,
  subscriptionTier: 'enterprise',
  isAdmin: true,
};

function resetAuthStore() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    accessTokenExpiresAt: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    isAuthenticated: false,
    isBootstrapped: false,
  });
}

describe('auth-methods', () => {
  beforeEach(() => {
    refreshByTokenMock.mockReset();
    fetchCurrentUserMock.mockReset();
    signInWithEmailMock.mockReset();
    logoutByTokenMock.mockReset();
    resetAuthStore();
  });

  it('returns current access token when it is still valid', async () => {
    useAuthStore.setState({
      accessToken: 'access-token',
      accessTokenExpiresAt: futureIso(2 * 60 * 60 * 1000),
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: futureIso(24 * 60 * 60 * 1000),
      isAuthenticated: true,
      isBootstrapped: true,
      user: ADMIN_USER,
    });

    const token = await ensureAccessToken();

    expect(token).toBe('access-token');
    expect(refreshByTokenMock).not.toHaveBeenCalled();
  });

  it('clears session when refresh token is missing during refresh', async () => {
    useAuthStore.setState({
      user: ADMIN_USER,
      accessToken: 'stale-access',
      accessTokenExpiresAt: pastIso(5 * 60 * 1000),
      refreshToken: null,
      refreshTokenExpiresAt: null,
      isAuthenticated: true,
      isBootstrapped: true,
    });

    const refreshed = await refreshAccessToken();

    expect(refreshed).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('bootstraps session by refreshing token and loading admin profile', async () => {
    refreshByTokenMock.mockResolvedValueOnce({
      accessToken: 'new-access-token',
      accessTokenExpiresAt: futureIso(2 * 60 * 60 * 1000),
      refreshToken: 'new-refresh-token',
      refreshTokenExpiresAt: futureIso(24 * 60 * 60 * 1000),
    });
    fetchCurrentUserMock.mockResolvedValueOnce(ADMIN_USER);

    useAuthStore.setState({
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: futureIso(24 * 60 * 60 * 1000),
      accessToken: null,
      accessTokenExpiresAt: null,
      isAuthenticated: false,
      isBootstrapped: false,
      user: null,
    });

    await bootstrapAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isBootstrapped).toBe(true);
    expect(state.user?.email).toBe('admin@anyhunt.app');
    expect(refreshByTokenMock).toHaveBeenCalledTimes(1);
    expect(fetchCurrentUserMock).toHaveBeenCalledTimes(1);
  });

  it('clears session when signed-in user is not admin', async () => {
    signInWithEmailMock.mockResolvedValueOnce({
      accessToken: 'access-token',
      accessTokenExpiresAt: futureIso(2 * 60 * 60 * 1000),
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: futureIso(24 * 60 * 60 * 1000),
    });
    fetchCurrentUserMock.mockResolvedValueOnce({
      ...ADMIN_USER,
      isAdmin: false,
    });

    await expect(signIn('user@anyhunt.app', 'password')).rejects.toThrow('Admin access required');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('invalidates local session after server logout', async () => {
    logoutByTokenMock.mockResolvedValueOnce(undefined);
    useAuthStore.setState({
      user: ADMIN_USER,
      accessToken: 'access-token',
      accessTokenExpiresAt: futureIso(2 * 60 * 60 * 1000),
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: futureIso(24 * 60 * 60 * 1000),
      isAuthenticated: true,
      isBootstrapped: true,
    });

    await logout();

    const state = useAuthStore.getState();
    expect(logoutByTokenMock).toHaveBeenCalledWith('refresh-token');
    expect(state.isAuthenticated).toBe(false);
    expect(state.isBootstrapped).toBe(true);
    expect(state.refreshToken).toBeNull();
  });
});
