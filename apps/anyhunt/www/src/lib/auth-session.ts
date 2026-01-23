/**
 * [PROVIDES]: access token 内存态 + refresh/logout 流程
 * [DEPENDS]: /api/auth/refresh, /api/auth/logout
 * [POS]: www 端 Access Token 会话管理（不落地存储）
 */

import { API_BASE_URL } from './api-base';

type AuthResponse = {
  accessToken?: string;
};

const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`;

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

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

      if (!data?.accessToken) {
        setAccessToken(null);
        return false;
      }

      setAccessToken(data.accessToken);
      return true;
    })()
      .catch(() => {
        setAccessToken(null);
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const bootstrapAuth = async () => {
  await refreshAccessToken();
};

export const logout = async () => {
  await fetch(`${AUTH_BASE_URL}/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => undefined);

  setAccessToken(null);
};
