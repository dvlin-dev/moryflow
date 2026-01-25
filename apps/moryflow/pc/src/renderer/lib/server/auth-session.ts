/**
 * [PROVIDES]: access token store + refresh 轮换与预刷新（网络失败不清理）
 * [DEPENDS]: /api/auth/refresh, desktopAPI, auth-store
 * [POS]: Desktop 端 Auth Session 管理
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { MEMBERSHIP_API_URL } from './const';
import {
  ACCESS_TOKEN_SKEW_MS,
  authStore,
  isAccessTokenExpired,
  isAccessTokenExpiringSoon,
  waitForAuthHydration,
} from './auth-store';

const DEVICE_PLATFORM = 'desktop';
let refreshPromise: Promise<boolean> | null = null;
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingRefresh = false;

const syncAccessToken = (token: string | null) => {
  if (window.desktopAPI?.membership?.syncToken) {
    window.desktopAPI.membership.syncToken(token).catch((err) => {
      console.error('[auth-session] Failed to sync token to main:', err);
    });
  }
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
    syncAccessToken(null);
    return;
  }

  authStore.getState().setAccessToken(token, expiresAt ?? null);
  scheduleRefresh(expiresAt ?? null);
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
  pendingRefresh = false;
  await setStoredRefreshToken(null);
};

export const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getStoredRefreshToken();

      try {
        const response = await fetch(`${MEMBERSHIP_API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-App-Platform': DEVICE_PLATFORM,
          },
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
      syncAccessToken(accessToken);
      return true;
    }
    return refreshed;
  }

  scheduleRefresh(accessTokenExpiresAt);
  syncAccessToken(accessToken);
  return true;
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
