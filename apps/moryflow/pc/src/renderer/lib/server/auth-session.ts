/**
 * [PROVIDES]: access token store + refresh 轮换与预刷新（网络失败不清理）
 * [DEPENDS]: /api/v1/auth/refresh, desktopAPI, auth-store
 * [POS]: Desktop 端 Auth Session 管理
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

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

type TokenPayload = {
  accessToken?: string;
  accessTokenExpiresAt?: string;
};

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

const hasStoredRefreshToken = async (): Promise<boolean> => {
  if (!window.desktopAPI?.membership?.hasRefreshToken) {
    return false;
  }
  return window.desktopAPI.membership.hasRefreshToken();
};

export const shouldClearAuthSessionAfterEnsureFailure = async (): Promise<boolean> => {
  const hasRefreshToken = await hasStoredRefreshToken();
  return !hasRefreshToken;
};

export const clearAuthSession = async () => {
  setAccessToken(null);
  pendingRefresh = false;
  await window.desktopAPI?.membership?.clearSession?.();
};

const isTokenPayload = (payload: unknown): payload is Required<TokenPayload> => {
  const data = payload as TokenPayload | null;
  return Boolean(
    data && typeof data.accessToken === 'string' && typeof data.accessTokenExpiresAt === 'string'
  );
};

export const syncAccessSessionFromPayload = async (payload: unknown): Promise<boolean> => {
  if (!isTokenPayload(payload)) {
    return false;
  }

  setAccessToken(payload.accessToken, payload.accessTokenExpiresAt);
  pendingRefresh = false;
  return true;
};

export const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const hasRefreshToken = await hasStoredRefreshToken();
      if (!hasRefreshToken) {
        pendingRefresh = false;
        return false;
      }

      const result = await window.desktopAPI.membership.refreshSession();
      if (!result.ok) {
        if (result.reason === 'unauthorized' || result.reason === 'invalid_response') {
          await clearAuthSession();
          return false;
        }
        pendingRefresh = true;
        return false;
      }

      const synced = await syncAccessSessionFromPayload(result.payload);
      if (!synced) {
        await clearAuthSession();
        return false;
      }

      return true;
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
  await window.desktopAPI.membership.logout?.();
};
