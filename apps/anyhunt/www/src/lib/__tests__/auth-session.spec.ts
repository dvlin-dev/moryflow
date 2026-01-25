/**
 * [INPUT]: refresh/logout 调用
 * [OUTPUT]: access token 内存态更新断言
 * [POS]: www Auth Session 单元测试（access/refresh 交互）
 */
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';

const fetchMock = vi.fn<typeof fetch>();

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
  });

  it('refreshAccessToken 成功时写入 accessToken', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'token_123',
        accessTokenExpiresAt: '2026-01-25T12:00:00.000Z',
      })
    );

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('token_123');
  });

  it('refreshAccessToken 失败时清空 accessToken', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401));

    const { refreshAccessToken, getAccessToken } = await import('../auth-session');
    const result = await refreshAccessToken();

    expect(result).toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  it('logout 应清空 accessToken，即使请求失败', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'token_abc',
        accessTokenExpiresAt: '2026-01-25T12:00:00.000Z',
      })
    );

    const { refreshAccessToken, getAccessToken, logout } = await import('../auth-session');
    await refreshAccessToken();

    fetchMock.mockRejectedValueOnce(new Error('network'));
    await logout();

    expect(getAccessToken()).toBeNull();
  });
});
