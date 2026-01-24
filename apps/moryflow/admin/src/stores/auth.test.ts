/**
 * AuthStore 单元测试
 * 关注 access token 内存策略与刷新行为
 */
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { useAuthStore } from './auth';

const createResponse = (data: unknown, init?: { ok?: boolean; status?: number }) => {
  const ok = init?.ok ?? true;
  const status = init?.status ?? (ok ? 200 : 400);
  return {
    ok,
    status,
    json: async () => data,
  } as Response;
};

describe('AuthStore', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isBootstrapping: false,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('logout 会清空本地认证状态', async () => {
    globalThis.fetch = vi.fn(async () => createResponse({}));

    useAuthStore.setState({
      user: { id: 'u1', email: 'admin@example.com', isAdmin: true },
      accessToken: 'token-1',
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('refreshAccessToken 成功时写入 access token', async () => {
    globalThis.fetch = vi.fn(async () => createResponse({ accessToken: 'access-123' }));

    const ok = await useAuthStore.getState().refreshAccessToken();

    expect(ok).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('access-123');
  });

  it('ensureAccessToken 优先返回内存 token', async () => {
    useAuthStore.setState({ accessToken: 'cached-token' });

    const token = await useAuthStore.getState().ensureAccessToken();

    expect(token).toBe('cached-token');
  });

  it('bootstrap 会在 refresh 成功后拉取管理员信息', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.endsWith('/api/auth/refresh')) {
        return createResponse({ accessToken: 'access-boot' });
      }
      if (url.endsWith('/api/admin/me')) {
        return createResponse({
          user: { id: 'admin-1', email: 'admin@example.com', isAdmin: true },
        });
      }
      return createResponse({});
    });

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.user?.id).toBe('admin-1');
    expect(state.isAuthenticated).toBe(true);
  });

  it('bootstrap 对非管理员会清空认证状态', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.endsWith('/api/auth/refresh')) {
        return createResponse({ accessToken: 'access-boot' });
      }
      if (url.endsWith('/api/admin/me')) {
        return createResponse({
          user: { id: 'user-1', email: 'user@example.com', isAdmin: false },
        });
      }
      return createResponse({});
    });

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('signIn 会拒绝非管理员账号', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.endsWith('/api/auth/sign-in/email')) {
        return createResponse({});
      }
      if (url.endsWith('/api/auth/refresh')) {
        return createResponse({ accessToken: 'access-sign-in' });
      }
      if (url.endsWith('/api/admin/me')) {
        return createResponse({
          user: { id: 'user-2', email: 'user@example.com', isAdmin: false },
        });
      }
      return createResponse({});
    });

    await expect(useAuthStore.getState().signIn('user@example.com', 'pass')).rejects.toThrow(
      'Admin access required'
    );

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
