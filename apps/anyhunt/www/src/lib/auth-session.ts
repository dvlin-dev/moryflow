/**
 * [PROVIDES]: access token store + refresh/logout 流程
 * [DEPENDS]: /api/auth/refresh, /api/auth/logout, auth-store
 * [POS]: www 端 Access Token 会话管理（Zustand store + refresh 轮换）
 */

import { API_BASE_URL } from './api-base';
import {
  authStore,
  ACCESS_TOKEN_SKEW_MS,
  isAccessTokenExpiringSoon,
  waitForAuthHydration,
} from '@/stores/auth-store';

type AuthResponse = {
  accessToken?: string;
  accessTokenExpiresAt?: string;
};

const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`;

let refreshPromise: Promise<boolean> | null = null;
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

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

  if (typeof refreshTimeout === 'object' && 'unref' in refreshTimeout) {
    refreshTimeout.unref();
  }
};

export const getAccessToken = () => authStore.getState().accessToken;

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return data as T;
  }
  return data as T;
};

export const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const data = await fetchJson<AuthResponse>(`${AUTH_BASE_URL}/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!data?.accessToken || !data?.accessTokenExpiresAt) {
        authStore.getState().clearAccessToken();
        scheduleRefresh(null);
        return false;
      }

      authStore.getState().setAccessToken(data.accessToken, data.accessTokenExpiresAt);
      scheduleRefresh(data.accessTokenExpiresAt);
      return true;
    })()
      .catch(() => {
        authStore.getState().clearAccessToken();
        scheduleRefresh(null);
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const bootstrapAuth = async () => {
  await waitForAuthHydration();

  const { accessToken, accessTokenExpiresAt } = authStore.getState();
  if (!accessToken || isAccessTokenExpiringSoon(accessTokenExpiresAt)) {
    void refreshAccessToken();
    return;
  }

  scheduleRefresh(accessTokenExpiresAt);
};

export const logout = async () => {
  await fetch(`${AUTH_BASE_URL}/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => undefined);

  authStore.getState().clearAccessToken();
  scheduleRefresh(null);
};
