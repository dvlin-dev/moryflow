/**
 * [INPUT]: auth store setter/helpers
 * [OUTPUT]: 状态更新与过期判断断言
 * [POS]: Console Auth Store 单元测试（仅状态，不包含网络）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  hasUsableAccessToken,
  isAccessTokenExpiringSoon,
  isExpired,
  parseExpiresAt,
  type AuthTokenBundle,
  useAuthStore,
} from './auth';

const futureIso = (ms: number) => new Date(Date.now() + ms).toISOString();
const pastIso = (ms: number) => new Date(Date.now() - ms).toISOString();

const bundle: AuthTokenBundle = {
  accessToken: 'access_1',
  accessTokenExpiresAt: futureIso(2 * 60 * 60 * 1000),
  refreshToken: 'refresh_1',
  refreshTokenExpiresAt: futureIso(24 * 60 * 60 * 1000),
};

describe('console auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      accessTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      isAuthenticated: false,
      isBootstrapped: false,
    });
  });

  it('setTokenBundle 应写入 access/refresh 并标记 isAuthenticated', () => {
    useAuthStore.getState().setTokenBundle(bundle);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe(bundle.accessToken);
    expect(state.refreshToken).toBe(bundle.refreshToken);
    expect(state.isAuthenticated).toBe(true);
  });

  it('clearSession 应清空会话状态', () => {
    useAuthStore.getState().setTokenBundle(bundle);
    useAuthStore.getState().setUser({
      id: 'u_1',
      email: 'dev@anyhunt.app',
      name: 'dev',
      subscriptionTier: 'PRO',
      isAdmin: false,
    });

    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('token 过期工具函数行为正确', () => {
    const validExpiresAt = futureIso(2 * 60 * 60 * 1000);
    const expiringSoon = futureIso(10 * 60 * 1000);
    const expired = pastIso(1000);

    expect(parseExpiresAt(validExpiresAt)).not.toBeNull();
    expect(isExpired(validExpiresAt)).toBe(false);
    expect(isExpired(expired)).toBe(true);

    expect(isAccessTokenExpiringSoon(validExpiresAt)).toBe(false);
    expect(isAccessTokenExpiringSoon(expiringSoon)).toBe(true);

    expect(hasUsableAccessToken('token', validExpiresAt)).toBe(true);
    expect(hasUsableAccessToken('token', expired)).toBe(false);
    expect(hasUsableAccessToken(null, validExpiresAt)).toBe(false);
  });
});
