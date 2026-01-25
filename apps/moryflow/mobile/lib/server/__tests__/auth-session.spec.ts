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
  AUTH_BASE_URL: 'https://server.test/api/auth',
  clearAuthCookieStorage: vi.fn(),
  getAuthCookie: vi.fn(),
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
    const authClient = await import('../auth-client');

    vi.mocked(storage.getStoredRefreshToken).mockResolvedValue('rt');
    vi.mocked(authClient.getAuthCookie).mockReturnValue('session=abc');

    fetchMock.mockRejectedValueOnce(new Error('network'));

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(storage.clearStoredRefreshToken).not.toHaveBeenCalled();
    expect(authClient.clearAuthCookieStorage).not.toHaveBeenCalled();
  });

  it('refreshAccessToken 成功时更新 access/refresh', async () => {
    const storage = await import('../storage');
    const authClient = await import('../auth-client');

    vi.mocked(storage.getStoredRefreshToken).mockResolvedValue('rt');
    vi.mocked(authClient.getAuthCookie).mockReturnValue('');

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'access',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshToken: 'refresh-next',
      })
    );

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('access');
    expect(storage.setStoredRefreshToken).toHaveBeenCalledWith('refresh-next');
  });

  it('ensureAccessToken 在无 token 时触发 refresh', async () => {
    const storage = await import('../storage');

    vi.mocked(storage.getStoredRefreshToken).mockResolvedValue('rt');

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'access',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      })
    );

    const { ensureAccessToken, getAccessToken } = await import('../auth-session');
    const result = await ensureAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('access');
  });
});
