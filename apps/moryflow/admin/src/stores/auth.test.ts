import { describe, expect, it, vi } from 'vitest';
import { reconcileRehydratedAuthState, useAuthStore } from './auth';

const futureIso = (ms: number) => new Date(Date.now() + ms).toISOString();
const pastIso = (ms: number) => new Date(Date.now() - ms).toISOString();

describe('moryflow admin auth store rehydrate', () => {
  it('clears session when refresh token is missing or expired', () => {
    const clearSession = vi.fn();
    const setState = vi.fn();

    reconcileRehydratedAuthState(
      {
        accessToken: 'access',
        accessTokenExpiresAt: futureIso(60 * 60 * 1000),
        refreshToken: null,
        refreshTokenExpiresAt: null,
        clearSession,
      },
      setState
    );

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(setState).not.toHaveBeenCalled();
  });

  it('drops only access token when access token is expired and refresh is still valid', () => {
    const clearSession = vi.fn();
    const setState = vi.fn();

    reconcileRehydratedAuthState(
      {
        accessToken: 'access',
        accessTokenExpiresAt: pastIso(60 * 1000),
        refreshToken: 'refresh',
        refreshTokenExpiresAt: futureIso(24 * 60 * 60 * 1000),
        clearSession,
      },
      setState
    );

    expect(clearSession).not.toHaveBeenCalled();
    expect(setState).toHaveBeenCalledWith({
      accessToken: null,
      accessTokenExpiresAt: null,
    });
  });

  it('supports applying rehydrate patches through store setState callback', () => {
    useAuthStore.setState({
      accessToken: 'access',
      accessTokenExpiresAt: pastIso(60 * 1000),
      refreshToken: 'refresh',
      refreshTokenExpiresAt: futureIso(24 * 60 * 60 * 1000),
      isAuthenticated: true,
    });

    const state = useAuthStore.getState();
    reconcileRehydratedAuthState(
      {
        accessToken: state.accessToken,
        accessTokenExpiresAt: state.accessTokenExpiresAt,
        refreshToken: state.refreshToken,
        refreshTokenExpiresAt: state.refreshTokenExpiresAt,
        clearSession: state.clearSession,
      },
      (partial) => useAuthStore.setState(partial)
    );

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBe('refresh');
  });
});
