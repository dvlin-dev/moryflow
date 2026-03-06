/**
 * [INPUT]: refresh/logout 调用
 * [OUTPUT]: refresh 结果与 session 清理断言
 * [POS]: Mobile Auth Session 单元测试
 */
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

const fetchMock = vi.fn<typeof fetch>();

vi.mock('../storage', () => ({
  getStoredRefreshToken: vi.fn(),
  setStoredRefreshToken: vi.fn(),
  clearStoredRefreshToken: vi.fn(),
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}));

vi.mock('../auth-client', () => ({
  AUTH_BASE_URL: 'https://server.test/api/v1/auth',
}));

vi.mock('../auth-platform', () => ({
  DEVICE_PLATFORM: 'ios',
}));

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('auth-session', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('refreshAccessToken 网络失败时不清理 session', async () => {
    const storage = await import('../storage');

    vi.mocked(storage.getStoredRefreshToken).mockResolvedValue('rt');

    fetchMock.mockRejectedValueOnce(new Error('network'));

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(storage.clearStoredRefreshToken).not.toHaveBeenCalled();
  });

  it('refreshAccessToken 成功时更新 access/refresh', async () => {
    const storage = await import('../storage');

    vi.mocked(storage.getStoredRefreshToken).mockResolvedValue('rt');

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'access',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshToken: 'refresh-next',
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
    );

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('access');
    expect(storage.setStoredRefreshToken).toHaveBeenCalledWith('refresh-next');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://server.test/api/v1/auth/refresh');
  });

  it('ensureAccessToken 在无 token 时触发 refresh', async () => {
    const storage = await import('../storage');

    vi.mocked(storage.getStoredRefreshToken).mockResolvedValue('rt');

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'access',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshToken: 'refresh-next',
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
    );

    const { ensureAccessToken, getAccessToken } = await import('../auth-session');
    const result = await ensureAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('access');
  });

  it('shouldClearAuthSessionAfterEnsureFailure 在 refresh token 存在时返回 false', async () => {
    const storage = await import('../storage');

    vi.mocked(storage.getStoredRefreshToken).mockResolvedValue('rt');

    const { shouldClearAuthSessionAfterEnsureFailure } = await import('../auth-session');
    const result = await shouldClearAuthSessionAfterEnsureFailure();

    expect(result).toBe(false);
  });

  it('shouldClearAuthSessionAfterEnsureFailure 在 refresh token 缺失时返回 true', async () => {
    const storage = await import('../storage');

    vi.mocked(storage.getStoredRefreshToken).mockResolvedValue(null);

    const { shouldClearAuthSessionAfterEnsureFailure } = await import('../auth-session');
    const result = await shouldClearAuthSessionAfterEnsureFailure();

    expect(result).toBe(true);
  });

  it('logoutFromServer should call /api/v1/auth/logout', async () => {
    const storage = await import('../storage');

    vi.mocked(storage.getStoredRefreshToken).mockResolvedValue('rt');
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'ok' }));

    const { logoutFromServer } = await import('../auth-session');
    await logoutFromServer();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://server.test/api/v1/auth/logout');
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit?.body).toBe(JSON.stringify({ refreshToken: 'rt' }));
  });
});
