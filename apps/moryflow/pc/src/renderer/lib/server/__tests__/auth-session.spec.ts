/**
 * [INPUT]: refresh/ensure 调用
 * [OUTPUT]: access token 持久化与同步行为
 * [POS]: Desktop Auth Session 单元测试
 * [UPDATE]: 2026-02-24 - 预刷新窗口改为 1h 后，ensureAccessToken 持久化 token 用例改为 >1h 过期时间
 * [UPDATE]: 2026-02-24 - 补充无 refresh token fail-fast 与 shouldClearAuthSessionAfterEnsureFailure 回归用例
 * [UPDATE]: 2026-02-24 - 删除 cookie fallback 用例，改为验证 body refreshToken 与 token 整包写入
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn<typeof fetch>();

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
    setRefreshToken: vi.fn(async (token: string) => {
      storedRefreshToken = token;
    }),
    clearRefreshToken: vi.fn(async () => {
      storedRefreshToken = null;
    }),
    refreshSession: vi.fn(async () => {
      if (!storedRefreshToken) {
        return null;
      }
      return {
        accessToken: 'access',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshToken: 'rt-next',
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
      };
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
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('refreshAccessToken 成功时更新 access token 并同步到 main', async () => {
    const { membership, getStoredAccessToken, getStoredAccessTokenExpiresAt } = setupDesktopApi();

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('access');
    expect(getStoredAccessToken()).toBe('access');
    expect(getStoredAccessTokenExpiresAt()).toBeTruthy();
    expect(membership.syncToken).toHaveBeenCalledWith('access');
    expect(membership.setRefreshToken).toHaveBeenCalledWith('rt-next');
    expect(membership.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('refreshAccessToken 失败时清理 access token', async () => {
    const { membership, getStoredAccessToken } = setupDesktopApi();

    membership.refreshSession.mockResolvedValueOnce(null);

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(getStoredAccessToken()).toBeNull();
  });

  it('refreshAccessToken 网络失败时保留已有 token', async () => {
    const { membership, getStoredAccessToken, setStoredAccessToken } = setupDesktopApi();
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    setStoredAccessToken('persisted', expiresAt);

    membership.refreshSession.mockRejectedValueOnce(new Error('network'));

    const { refreshAccessToken, getAccessToken, setAccessToken } = await import('../auth-session');
    setAccessToken('persisted', expiresAt);
    const result = await refreshAccessToken();

    expect(result).toBe(false);
    expect(getAccessToken()).toBe('persisted');
    expect(getStoredAccessToken()).toBe('persisted');
    expect(membership.clearRefreshToken).not.toHaveBeenCalled();
  });

  it('ensureAccessToken 使用持久化 token 时不触发 refresh', async () => {
    const { membership, setStoredAccessToken } = setupDesktopApi();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60_000).toISOString();
    setStoredAccessToken('persisted', expiresAt);

    const { ensureAccessToken, getAccessToken } = await import('../auth-session');
    const result = await ensureAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('persisted');
    expect(membership.refreshSession).not.toHaveBeenCalled();
  });

  it('refreshAccessToken 在 refresh token 缺失时直接返回 false 且不请求网络', async () => {
    const { membership, setStoredRefreshToken } = setupDesktopApi();
    setStoredRefreshToken(null);

    const { refreshAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(false);
    expect(membership.refreshSession).not.toHaveBeenCalled();
  });

  it('shouldClearAuthSessionAfterEnsureFailure 在 refresh token 存在时返回 false', async () => {
    setupDesktopApi();

    const { shouldClearAuthSessionAfterEnsureFailure } = await import('../auth-session');
    const result = await shouldClearAuthSessionAfterEnsureFailure();

    expect(result).toBe(false);
  });

  it('logoutFromServer 调用主进程代理 logout', async () => {
    const { membership } = setupDesktopApi();

    const { logoutFromServer } = await import('../auth-session');
    await logoutFromServer();

    expect(membership.logout).toHaveBeenCalledTimes(1);
  });

  it('shouldClearAuthSessionAfterEnsureFailure 在 refresh token 缺失时返回 true', async () => {
    const { setStoredRefreshToken } = setupDesktopApi();
    setStoredRefreshToken(null);

    const { shouldClearAuthSessionAfterEnsureFailure } = await import('../auth-session');
    const result = await shouldClearAuthSessionAfterEnsureFailure();

    expect(result).toBe(true);
  });
});
