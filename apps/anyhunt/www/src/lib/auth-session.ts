/**
 * [PROVIDES]: token session compatibility facade（bootstrap/refresh/logout/getAccessToken）
 * [DEPENDS]: auth-methods, auth-store
 * [POS]: 向后兼容导出，内部已迁移到 auth-methods
 */

import { authStore, type AuthTokenBundle } from '@/stores/auth-store';
import { authMethods, getAccessToken as readAccessToken } from './auth/auth-methods';

type AuthResponse = Partial<AuthTokenBundle>;

const isAuthTokenBundle = (value: unknown): value is AuthTokenBundle => {
  const payload = value as AuthResponse | null;
  return Boolean(
    payload &&
    typeof payload.accessToken === 'string' &&
    typeof payload.accessTokenExpiresAt === 'string' &&
    typeof payload.refreshToken === 'string' &&
    typeof payload.refreshTokenExpiresAt === 'string'
  );
};

export const getAccessToken = () => readAccessToken();

export const syncSessionFromAuthResponse = (payload: unknown): boolean => {
  if (!isAuthTokenBundle(payload)) {
    return false;
  }

  authStore.getState().setTokenBundle(payload);
  return true;
};

export const refreshAccessToken = () => authMethods.refreshAccessToken();

export const bootstrapAuth = () => authMethods.bootstrapAuth();

export const logout = () => authMethods.logout();
