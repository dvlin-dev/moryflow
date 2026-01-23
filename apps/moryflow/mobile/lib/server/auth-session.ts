/**
 * [PROVIDES]: access token 内存态 + refresh token 轮换流程
 * [DEPENDS]: /api/auth/refresh, SecureStore
 * [POS]: Mobile 端 Auth Session 管理（access/refresh）
 */

import { Platform } from 'react-native';
import { MEMBERSHIP_API_URL } from '@anyhunt/api';
import { getStoredRefreshToken, setStoredRefreshToken, clearStoredRefreshToken } from './storage';

const DEVICE_PLATFORM = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'mobile';

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const clearAuthSession = async () => {
  setAccessToken(null);
  await clearStoredRefreshToken();
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
