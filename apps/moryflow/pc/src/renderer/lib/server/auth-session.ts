/**
 * [PROVIDES]: access token 内存态与 refresh 轮换
 * [DEPENDS]: /api/auth/refresh, desktopAPI
 * [POS]: Desktop 端 Auth Session 管理
 */

import { MEMBERSHIP_API_URL } from './const';

const DEVICE_PLATFORM = 'desktop';
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

const syncAccessToken = (token: string | null) => {
  if (window.desktopAPI?.membership?.syncToken) {
    window.desktopAPI.membership.syncToken(token).catch((err) => {
      console.error('[auth-session] Failed to sync token to main:', err);
    });
  }
};

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  syncAccessToken(token);
};

const getStoredRefreshToken = async (): Promise<string | null> => {
  if (!window.desktopAPI?.membership?.getRefreshToken) {
    return null;
  }
  return window.desktopAPI.membership.getRefreshToken();
};

const setStoredRefreshToken = async (token: string | null) => {
  if (!window.desktopAPI?.membership?.setRefreshToken) {
    return;
  }
  if (!token) {
    await window.desktopAPI.membership.clearRefreshToken?.();
    return;
  }
  await window.desktopAPI.membership.setRefreshToken(token);
};

export const clearAuthSession = async () => {
  setAccessToken(null);
  await setStoredRefreshToken(null);
};

export const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getStoredRefreshToken();

      const response = await fetch(`${MEMBERSHIP_API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Platform': DEVICE_PLATFORM,
        },
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
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

export const logoutFromServer = async () => {
  const refreshToken = await getStoredRefreshToken();
  await fetch(`${MEMBERSHIP_API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Platform': DEVICE_PLATFORM,
    },
    body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
  }).catch(() => undefined);
};
