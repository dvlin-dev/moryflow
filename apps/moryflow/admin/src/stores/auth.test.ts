import { describe, expect, it, vi } from 'vitest';
import { reconcileRehydratedAuthState } from './auth';

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
});
