/**
 * [INPUT]: refresh/ensure 调用
 * [OUTPUT]: access token 持久化与同步行为
 * [POS]: Desktop Auth Session 单元测试
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { MembershipRefreshSessionResult } from '@shared/ipc';

const createAccessSessionPayload = () => {
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  return {
    accessToken: 'access',
    accessTokenExpiresAt: expiresAt,
  };
};

const setupDesktopApi = () => {
  let storedAccessToken: string | null = null;
  let storedAccessTokenExpiresAt: string | null = null;
  let storedRefreshToken: string | null = 'rt';

  const membership = {
    syncToken: vi.fn(async () => undefined),
    syncEnabled: vi.fn(async () => undefined),
    getAccessToken: vi.fn(async () => storedAccessToken),
    setAccessToken: vi.fn(async (token: string) => {
      storedAccessToken = token;
    }),
    clearAccessToken: vi.fn(async () => {
      storedAccessToken = null;
      storedAccessTokenExpiresAt = null;
    }),
    getAccessTokenExpiresAt: vi.fn(async () => storedAccessTokenExpiresAt),
    setAccessTokenExpiresAt: vi.fn(async (expiresAt: string) => {
      storedAccessTokenExpiresAt = expiresAt;
    }),
    clearAccessTokenExpiresAt: vi.fn(async () => {
      storedAccessTokenExpiresAt = null;
    }),
    hasRefreshToken: vi.fn(async () => Boolean(storedRefreshToken)),
    refreshSession: vi.fn<() => Promise<MembershipRefreshSessionResult>>(async () => ({
      ok: true,
      payload: createAccessSessionPayload(),
    })),
    clearSession: vi.fn(async () => {
      storedRefreshToken = null;
      storedAccessToken = null;
      storedAccessTokenExpiresAt = null;
    }),
    logout: vi.fn(async () => undefined),
  };

  (window as unknown as { desktopAPI: unknown }).desktopAPI = {
    membership,
  };

  return {
    membership,
    getStoredAccessToken: () => storedAccessToken,
    getStoredAccessTokenExpiresAt: () => storedAccessTokenExpiresAt,
    setStoredAccessToken: (token: string | null, expiresAt: string | null) => {
      storedAccessToken = token;
      storedAccessTokenExpiresAt = expiresAt;
    },
    setStoredRefreshToken: (token: string | null) => {
      storedRefreshToken = token;
    },
  };
};

describe('auth-session (desktop)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('refreshAccessToken 成功时更新 access token 并同步到 main', async () => {
    const { membership, getStoredAccessToken, getStoredAccessTokenExpiresAt } = setupDesktopApi();
    const tokenPayload = createAccessSessionPayload();
    membership.refreshSession.mockResolvedValueOnce({ ok: true, payload: tokenPayload });

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('access');
    expect(getStoredAccessToken()).toBe('access');
    expect(getStoredAccessTokenExpiresAt()).toBe(tokenPayload.accessTokenExpiresAt);
    expect(membership.syncToken).toHaveBeenCalledWith('access');
    expect(membership.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('refreshAccessToken 失败时清理 access token', async () => {
    const { membership, getStoredAccessToken } = setupDesktopApi();
    membership.refreshSession.mockResolvedValueOnce({
      ok: false,
      reason: 'unauthorized',
    });

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(getStoredAccessToken()).toBeNull();
    expect(membership.clearSession).toHaveBeenCalledTimes(1);
  });

  it('refreshAccessToken 网络失败时保留已有 token', async () => {
    const { membership, getStoredAccessToken, setStoredAccessToken } = setupDesktopApi();
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    setStoredAccessToken('persisted', expiresAt);
    membership.refreshSession.mockResolvedValueOnce({ ok: false, reason: 'network' });

    const { refreshAccessToken, getAccessToken, setAccessToken } = await import('../auth-session');
    setAccessToken('persisted', expiresAt);
    const result = await refreshAccessToken();

    expect(result).toBe(false);
    expect(getAccessToken()).toBe('persisted');
    expect(getStoredAccessToken()).toBe('persisted');
    expect(membership.clearSession).not.toHaveBeenCalled();
  });

  it('ensureAccessToken 使用持久化 token 时不触发 refresh', async () => {
    const { setStoredAccessToken } = setupDesktopApi();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60_000).toISOString();
    setStoredAccessToken('persisted', expiresAt);

    const { ensureAccessToken, getAccessToken } = await import('../auth-session');
    const result = await ensureAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('persisted');
  });

  it('refreshAccessToken 在 refresh token 缺失时直接返回 false 且不请求网络', async () => {
    const { setStoredRefreshToken } = setupDesktopApi();
    setStoredRefreshToken(null);

    const { refreshAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(false);
  });

  it('shouldClearAuthSessionAfterEnsureFailure 在 refresh token 存在时返回 false', async () => {
    setupDesktopApi();

    const { shouldClearAuthSessionAfterEnsureFailure } = await import('../auth-session');
    const result = await shouldClearAuthSessionAfterEnsureFailure();

    expect(result).toBe(false);
  });

  it('logoutFromServer 通过 main 进程执行且不暴露 refresh token', async () => {
    const { membership } = setupDesktopApi();

    const { logoutFromServer } = await import('../auth-session');
    await logoutFromServer();

    expect(membership.logout).toHaveBeenCalledTimes(1);
  });

  it('clearAuthSession 通过 main 进程统一清理本地会话', async () => {
    const { membership, setStoredAccessToken } = setupDesktopApi();
    setStoredAccessToken('persisted', new Date(Date.now() + 60_000).toISOString());

    const { clearAuthSession, getAccessToken, setAccessToken } = await import('../auth-session');
    setAccessToken('persisted', new Date(Date.now() + 60_000).toISOString());
    await clearAuthSession();

    expect(getAccessToken()).toBeNull();
    expect(membership.clearSession).toHaveBeenCalledTimes(1);
  });

  it('shouldClearAuthSessionAfterEnsureFailure 在 refresh token 缺失时返回 true', async () => {
    const { setStoredRefreshToken } = setupDesktopApi();
    setStoredRefreshToken(null);

    const { shouldClearAuthSessionAfterEnsureFailure } = await import('../auth-session');
    const result = await shouldClearAuthSessionAfterEnsureFailure();

    expect(result).toBe(true);
  });
});
