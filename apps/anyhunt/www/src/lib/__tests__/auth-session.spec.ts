/**
 * [INPUT]: refresh/logout 调用
 * [OUTPUT]: token session 状态更新断言
 * [POS]: www Auth Session 单元测试（Token-first）
 */
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';

const fetchMock = vi.fn<typeof fetch>();

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('auth-session', () => {
  const seedSession = async () => {
    const { authStore } = await import('@/stores/auth-store');
    authStore.getState().setTokenBundle({
      accessToken: 'seed_access',
      accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      refreshToken: 'seed_refresh_token_1234567890',
      refreshTokenExpiresAt: '2030-03-01T00:00:00.000Z',
    });
  };

  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshAccessToken 成功时写入 access + refresh token', async () => {
    await seedSession();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'token_123',
        accessTokenExpiresAt: '2026-01-25T12:00:00.000Z',
        refreshToken: 'refresh_1234567890',
        refreshTokenExpiresAt: '2026-04-25T12:00:00.000Z',
      })
    );

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const { authStore } = await import('@/stores/auth-store');
    const result = await refreshAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('token_123');
    expect(authStore.getState().refreshToken).toBe('refresh_1234567890');
  });

  it('refreshAccessToken 返回 401 时清空本地 session', async () => {
    await seedSession();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          type: 'https://anyhunt.app/errors/UNAUTHORIZED',
          title: 'Unauthorized',
          status: 401,
          detail: 'Invalid or expired refresh token',
          code: 'UNAUTHORIZED',
        },
        401
      )
    );

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const { authStore } = await import('@/stores/auth-store');
    const result = await refreshAccessToken();

    expect(result).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(authStore.getState().refreshToken).toBeNull();
  });

  it('refreshAccessToken 网络失败时保留本地 session', async () => {
    await seedSession();
    fetchMock.mockRejectedValueOnce(new Error('network'));

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const { authStore } = await import('@/stores/auth-store');
    const result = await refreshAccessToken();

    expect(result).toBe(false);
    expect(getAccessToken()).toBe('seed_access');
    expect(authStore.getState().refreshToken).toBe('seed_refresh_token_1234567890');
  });

  it('logout 应清空 token session，即使请求失败', async () => {
    await seedSession();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'token_abc',
        accessTokenExpiresAt: '2026-01-25T12:00:00.000Z',
        refreshToken: 'refresh_abc',
        refreshTokenExpiresAt: '2026-04-25T12:00:00.000Z',
      })
    );

    const { refreshAccessToken, getAccessToken, logout } = await import('../auth-session');
    const { authStore } = await import('@/stores/auth-store');
    await refreshAccessToken();

    fetchMock.mockRejectedValueOnce(new Error('network'));
    await logout();

    expect(getAccessToken()).toBeNull();
    expect(authStore.getState().refreshToken).toBeNull();
  });
});
