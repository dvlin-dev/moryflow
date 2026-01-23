/**
 * [PROVIDES]: authClient + auth storage keys
 * [DEPENDS]: better-auth/react, @better-auth/expo/client, expo-secure-store
 * [POS]: Mobile 端 Better Auth 客户端入口
 */

import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { MEMBERSHIP_API_URL } from '@anyhunt/api';
import { DEVICE_PLATFORM } from './auth-platform';

const AUTH_STORAGE_PREFIX = 'moryflow';
const AUTH_BASE_PATH = '/api/auth';

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

export const AUTH_BASE_URL = (() => {
  const base = normalizeBaseUrl(MEMBERSHIP_API_URL);
  return base.endsWith(AUTH_BASE_PATH) ? base : `${base}${AUTH_BASE_PATH}`;
})();

export const AUTH_COOKIE_STORAGE_KEY = `${AUTH_STORAGE_PREFIX}_cookie`;
export const AUTH_SESSION_STORAGE_KEY = `${AUTH_STORAGE_PREFIX}_session_data`;

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  fetchOptions: {
    headers: {
      'X-App-Platform': DEVICE_PLATFORM,
    },
  },
  plugins: [
    expoClient({
      scheme: 'moryflow',
      storagePrefix: AUTH_STORAGE_PREFIX,
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});

export const getAuthCookie = () => {
  const client = authClient as unknown as { getCookie?: () => string };
  const raw = client.getCookie?.() ?? '';
  return raw.replace(/^;\s*/, '');
};

export const clearAuthCookieStorage = async () => {
  await SecureStore.deleteItemAsync(AUTH_COOKIE_STORAGE_KEY);
  await SecureStore.deleteItemAsync(AUTH_SESSION_STORAGE_KEY);
};
