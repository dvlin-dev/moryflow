/**
 * [PROVIDES]: access token store + refresh 轮换流程（网络失败不清理）
 * [DEPENDS]: /api/auth/refresh, auth-client, auth-store, SecureStore
 * [POS]: Mobile 端 Auth Session 管理（access/refresh）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { getStoredRefreshToken, setStoredRefreshToken, clearStoredRefreshToken } from './storage';
import { AUTH_BASE_URL, clearAuthCookieStorage, getAuthCookie } from './auth-client';
import { DEVICE_PLATFORM } from './auth-platform';
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
  await clearAuthCookieStorage();
};

export const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getStoredRefreshToken();

      const authCookie = getAuthCookie();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-App-Platform': DEVICE_PLATFORM,
      };
      if (authCookie) {
        headers.Cookie = authCookie;
      }

      try {
        const response = await fetch(`${AUTH_BASE_URL}/refresh`, {
          method: 'POST',
          headers,
          body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
        });

        if (response.status === 401 || response.status === 403) {
          await clearAuthSession();
          return false;
        }

        if (!response.ok) {
          pendingRefresh = true;
          return false;
        }

        const data = await response.json().catch(() => ({}));
        if (!data?.accessToken || !data?.accessTokenExpiresAt) {
          await clearAuthSession();
          return false;
        }

        setAccessToken(data.accessToken, data.accessTokenExpiresAt);
        pendingRefresh = false;

        if (data.refreshToken) {
          await setStoredRefreshToken(data.refreshToken);
        }

        return true;
      } catch {
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
  const authCookie = getAuthCookie();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-App-Platform': DEVICE_PLATFORM,
  };
  if (authCookie) {
    headers.Cookie = authCookie;
  }

  await fetch(`${AUTH_BASE_URL}/logout`, {
    method: 'POST',
    headers,
    body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
  }).catch(() => undefined);
  await clearAuthCookieStorage();
};
