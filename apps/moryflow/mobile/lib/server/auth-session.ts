/**
 * [PROVIDES]: access token store + refresh 轮换流程（网络失败不清理）
 * [DEPENDS]: /api/v1/auth/refresh, auth-store, SecureStore
 * [POS]: Mobile 端 Auth Session 管理（access/refresh）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { getStoredRefreshToken, setStoredRefreshToken, clearStoredRefreshToken } from './storage';
import { AUTH_BASE_URL } from './auth-client';
import { DEVICE_PLATFORM } from './auth-platform';
import { createApiTransport, ServerApiError } from '@anyhunt/api/client';
import {
  ACCESS_TOKEN_SKEW_MS,
  authStore,
  isAccessTokenExpired,
  isAccessTokenExpiringSoon,
  waitForAuthHydration,
} from './auth-store';

let refreshPromise: Promise<boolean> | null = null;
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingRefresh = false;

const authTransport = createApiTransport({
  baseUrl: AUTH_BASE_URL,
});

type TokenPayload = {
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
};

const scheduleRefresh = (expiresAt?: string | null) => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }

  if (!expiresAt) {
    return;
  }

  const timestamp = Date.parse(expiresAt);
  if (Number.isNaN(timestamp)) {
    return;
  }

  const delay = Math.max(0, timestamp - Date.now() - ACCESS_TOKEN_SKEW_MS);
  refreshTimeout = setTimeout(() => {
    void refreshAccessToken();
  }, delay);

  if (typeof refreshTimeout === 'object' && refreshTimeout && 'unref' in refreshTimeout) {
    refreshTimeout.unref();
  }
};

export const getAccessToken = () => authStore.getState().accessToken;

export const setAccessToken = (token: string | null, expiresAt?: string | null) => {
  if (!token) {
    authStore.getState().clearAccessToken();
    scheduleRefresh(null);
    return;
  }

  authStore.getState().setAccessToken(token, expiresAt ?? null);
  scheduleRefresh(expiresAt ?? null);
};

export const clearAuthSession = async () => {
  setAccessToken(null);
  pendingRefresh = false;
  await clearStoredRefreshToken();
};

export const shouldClearAuthSessionAfterEnsureFailure = async (): Promise<boolean> => {
  const refreshToken = await getStoredRefreshToken();
  return !refreshToken;
};

const isTokenPayload = (payload: unknown): payload is Required<TokenPayload> => {
  const data = payload as TokenPayload | null;
  return Boolean(
    data &&
    typeof data.accessToken === 'string' &&
    typeof data.accessTokenExpiresAt === 'string' &&
    typeof data.refreshToken === 'string' &&
    typeof data.refreshTokenExpiresAt === 'string'
  );
};

export const syncAuthSessionFromPayload = async (payload: unknown): Promise<boolean> => {
  if (!isTokenPayload(payload)) {
    return false;
  }

  setAccessToken(payload.accessToken, payload.accessTokenExpiresAt);
  await setStoredRefreshToken(payload.refreshToken);
  pendingRefresh = false;
  return true;
};

export const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) {
        pendingRefresh = false;
        return false;
      }

      const headers = {
        'X-App-Platform': DEVICE_PLATFORM,
      };

      try {
        const data = await authTransport.request<TokenPayload>({
          path: '/api/v1/auth/refresh',
          method: 'POST',
          headers,
          body: { refreshToken },
        });
        if (!isTokenPayload(data)) {
          await clearAuthSession();
          return false;
        }

        await syncAuthSessionFromPayload(data);

        return true;
      } catch (error) {
        if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
          await clearAuthSession();
          return false;
        }
        pendingRefresh = true;
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

export const ensureAccessToken = async (): Promise<boolean> => {
  await waitForAuthHydration();
  const { accessToken, accessTokenExpiresAt } = authStore.getState();

  if (pendingRefresh || !accessToken || isAccessTokenExpiringSoon(accessTokenExpiresAt)) {
    const refreshed = await refreshAccessToken();
    if (!refreshed && accessToken && !isAccessTokenExpired(accessTokenExpiresAt)) {
      scheduleRefresh(accessTokenExpiresAt);
      return true;
    }
    return refreshed;
  }

  scheduleRefresh(accessTokenExpiresAt);
  return true;
};

export const logoutFromServer = async () => {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) {
    return;
  }

  await authTransport
    .request<void>({
      path: '/api/v1/auth/logout',
      method: 'POST',
      headers: {
        'X-App-Platform': DEVICE_PLATFORM,
      },
      body: { refreshToken },
    })
    .catch(() => undefined);
};
