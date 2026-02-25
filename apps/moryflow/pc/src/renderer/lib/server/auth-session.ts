/**
 * [PROVIDES]: access token store + refresh 轮换与预刷新（网络失败不清理）
 * [DEPENDS]: /api/v1/auth/refresh, desktopAPI, auth-store
 * [POS]: Desktop 端 Auth Session 管理
 * [UPDATE]: 2026-02-24 - refresh 改为仅接受 body refreshToken，删除 Cookie fallback 与 forceCookieSession
 * [UPDATE]: 2026-02-24 - 新增 syncAuthSessionFromPayload，登录/验证码验证成功后直接写入 access+refresh
 * [UPDATE]: 2026-02-24 - 保留 fail-fast（无 refresh token 不请求）+ 10s 超时 + 网络失败不清理 token
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { MEMBERSHIP_API_URL } from './const';
import { createApiTransport, ServerApiError } from '@anyhunt/api/client';
import {
  ACCESS_TOKEN_SKEW_MS,
  authStore,
  isAccessTokenExpired,
  isAccessTokenExpiringSoon,
  waitForAuthHydration,
} from './auth-store';

const DEVICE_PLATFORM = 'desktop';
const REFRESH_REQUEST_TIMEOUT_MS = 10_000;
let refreshPromise: Promise<boolean> | null = null;
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingRefresh = false;

const authTransport = createApiTransport({
  baseUrl: MEMBERSHIP_API_URL,
  timeoutMs: REFRESH_REQUEST_TIMEOUT_MS,
});

type TokenPayload = {
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
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

const getStoredRefreshToken = async (): Promise<string | null> => {
  if (!window.desktopAPI?.membership?.getRefreshToken) {
    return null;
  }
  return window.desktopAPI.membership.getRefreshToken();
};

export const shouldClearAuthSessionAfterEnsureFailure = async (): Promise<boolean> => {
  const refreshToken = await getStoredRefreshToken();
  return !refreshToken;
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

      try {
        const data = await authTransport.request<TokenPayload>({
          path: '/api/v1/auth/refresh',
          method: 'POST',
          headers: {
            'X-App-Platform': DEVICE_PLATFORM,
          },
          body: { refreshToken },
          timeoutMs: REFRESH_REQUEST_TIMEOUT_MS,
        });
        const synced = await syncAuthSessionFromPayload(data);
        if (!synced) {
          await clearAuthSession();
          return false;
        }

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
