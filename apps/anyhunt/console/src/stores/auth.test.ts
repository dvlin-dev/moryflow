/**
 * [INPUT]: refresh/logout/bootstrap 调用
 * [OUTPUT]: AuthStore 状态更新断言
 * [POS]: Console Auth Store 单元测试（access/refresh 交互）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { useAuthStore } from './auth';

const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('AuthStore', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isBootstrapped: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshAccessToken 应在成功时写入 accessToken', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ accessToken: 'token_123' }));

    const result = await useAuthStore.getState().refreshAccessToken();

    expect(result).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('token_123');
  });

  it('refreshAccessToken 应在失败时清空 accessToken', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          type: 'https://anyhunt.app/errors/UNAUTHORIZED',
          title: 'Unauthorized',
          status: 401,
          detail: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
        401
      )
    );

    const result = await useAuthStore.getState().refreshAccessToken();

    expect(result).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('bootstrap 应在 refresh 成功后设置 user 与认证状态', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'token_abc' }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'user_1',
          email: 'user@example.com',
          name: null,
          subscriptionTier: 'FREE',
          isAdmin: false,
        })
      );

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.isBootstrapped).toBe(true);
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('user@example.com');
    expect(state.user?.subscriptionTier).toBe('FREE');
  });

  it('logout 应清空用户状态，即使请求失败', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));

    useAuthStore.setState({
      user: {
        id: 'user_1',
        email: 'user@example.com',
        name: null,
        subscriptionTier: 'PRO',
        isAdmin: false,
      },
      accessToken: 'token_abc',
      isAuthenticated: true,
      isBootstrapped: false,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isBootstrapped).toBe(true);
  });
});
