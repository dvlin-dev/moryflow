/**
 * [PROVIDES]: refresh/access token 本地持久化（electron-store）
 * [DEPENDS]: ../storage/desktop-store
 * [POS]: Desktop 端 refresh/access token 存储
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { createDesktopStore } from '../storage/desktop-store.js';

const REFRESH_TOKEN_KEY = 'refreshToken';
const ACCESS_TOKEN_KEY = 'accessToken';
const ACCESS_TOKEN_EXPIRES_AT_KEY = 'accessTokenExpiresAt';

type MembershipTokenStoreSchema = Record<string, string>;

const store = createDesktopStore<MembershipTokenStoreSchema>({
  name: 'membership-token-store',
});

const readToken = async (key: string): Promise<string | null> => {
  try {
    const value = store.get(key);
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch (error) {
    console.error('[membership-token-store] local store read failed', error);
    return null;
  }
};

const writeToken = async (key: string, value: string): Promise<void> => {
  try {
    store.set(key, value);
  } catch (error) {
    console.error('[membership-token-store] local store write failed', error);
    throw error;
  }
};

const clearToken = async (key: string): Promise<void> => {
  try {
    store.delete(key);
  } catch (error) {
    console.error('[membership-token-store] local store delete failed', error);
    throw error;
  }
};

export const isSecureStorageAvailable = async (): Promise<boolean> => {
  return true;
};

export const getRefreshToken = async (): Promise<string | null> => readToken(REFRESH_TOKEN_KEY);

export const setRefreshToken = async (token: string): Promise<void> => {
  await writeToken(REFRESH_TOKEN_KEY, token);
};

export const clearRefreshToken = async (): Promise<void> => {
  await clearToken(REFRESH_TOKEN_KEY);
};

export const getAccessToken = async (): Promise<string | null> => readToken(ACCESS_TOKEN_KEY);

export const setAccessToken = async (token: string): Promise<void> => {
  await writeToken(ACCESS_TOKEN_KEY, token);
};

export const getAccessTokenExpiresAt = async (): Promise<string | null> =>
  readToken(ACCESS_TOKEN_EXPIRES_AT_KEY);

export const setAccessTokenExpiresAt = async (expiresAt: string): Promise<void> => {
  await writeToken(ACCESS_TOKEN_EXPIRES_AT_KEY, expiresAt);
};

export const clearAccessToken = async (): Promise<void> => {
  await clearToken(ACCESS_TOKEN_KEY);
  await clearToken(ACCESS_TOKEN_EXPIRES_AT_KEY);
};

export const clearAccessTokenExpiresAt = async (): Promise<void> => {
  await clearToken(ACCESS_TOKEN_EXPIRES_AT_KEY);
};
