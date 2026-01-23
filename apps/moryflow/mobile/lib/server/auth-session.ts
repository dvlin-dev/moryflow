/**
 * [PROVIDES]: access token 内存态 + refresh token 轮换流程（网络失败清理）
 * [DEPENDS]: /api/auth/refresh, auth-client, SecureStore
 * [POS]: Mobile 端 Auth Session 管理（access/refresh）
 */

import { getStoredRefreshToken, setStoredRefreshToken, clearStoredRefreshToken } from './storage';
import { AUTH_BASE_URL, clearAuthCookieStorage, getAuthCookie } from './auth-client';
import { DEVICE_PLATFORM } from './auth-platform';

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const clearAuthSession = async () => {
  setAccessToken(null);
  await clearStoredRefreshToken();
  await clearAuthCookieStorage();
};

export const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshToken = await getStoredRefreshToken();

        const authCookie = getAuthCookie();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-App-Platform': DEVICE_PLATFORM,
        };
        if (authCookie) {
          headers.Cookie = authCookie;
        }

        const response = await fetch(`${AUTH_BASE_URL}/refresh`, {
          method: 'POST',
          headers,
          body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
        });

        if (!response.ok) {
          await clearAuthSession();
          return false;
        }

        const data = await response.json().catch(() => ({}));
        if (!data?.accessToken) {
          await clearAuthSession();
          return false;
        }

        setAccessToken(data.accessToken);

        if (data.refreshToken) {
          await setStoredRefreshToken(data.refreshToken);
        }

        return true;
      } catch {
        await clearAuthSession();
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
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
