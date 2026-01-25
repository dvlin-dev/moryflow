/**
 * [INPUT]: refresh/ensure 调用
 * [OUTPUT]: access token 持久化与同步行为
 * [POS]: Desktop Auth Session 单元测试
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn<typeof fetch>();

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const setupDesktopApi = () => {
  let storedAccessToken: string | null = null;
  let storedAccessTokenExpiresAt: string | null = null;

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
    getRefreshToken: vi.fn(async () => 'rt'),
    setRefreshToken: vi.fn(async () => undefined),
    clearRefreshToken: vi.fn(async () => undefined),
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

    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ accessToken: 'access', accessTokenExpiresAt: expiresAt })
    );

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('access');
    expect(getStoredAccessToken()).toBe('access');
    expect(getStoredAccessTokenExpiresAt()).toBe(expiresAt);
    expect(membership.syncToken).toHaveBeenCalledWith('access');
  });

  it('refreshAccessToken 失败时清理 access token', async () => {
    const { getStoredAccessToken } = setupDesktopApi();

    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'unauthorized' }, 401));

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

    fetchMock.mockRejectedValueOnce(new Error('network'));

    const { refreshAccessToken, getAccessToken, setAccessToken } = await import('../auth-session');
    setAccessToken('persisted', expiresAt);
    const result = await refreshAccessToken();

    expect(result).toBe(false);
    expect(getAccessToken()).toBe('persisted');
    expect(getStoredAccessToken()).toBe('persisted');
    expect(membership.clearRefreshToken).not.toHaveBeenCalled();
  });

  it('ensureAccessToken 使用持久化 token 时不触发 refresh', async () => {
    const { setStoredAccessToken } = setupDesktopApi();
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    setStoredAccessToken('persisted', expiresAt);

    const { ensureAccessToken, getAccessToken } = await import('../auth-session');
    const result = await ensureAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('persisted');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
