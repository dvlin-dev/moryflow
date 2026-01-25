/**
 * [PROVIDES]: refresh/access token 安全存储（keytar）
 * [DEPENDS]: keytar (main process)
 * [POS]: Desktop 端 refresh/access token 存储
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

type KeytarApi = {
  getPassword: (service: string, account: string) => Promise<string | null>;
  setPassword: (service: string, account: string, password: string) => Promise<void>;
  deletePassword: (service: string, account: string) => Promise<boolean>;
};

const KEYTAR_SERVICE = 'moryflow.membership.auth';
const REFRESH_TOKEN_KEY = 'refreshToken';
const ACCESS_TOKEN_KEY = 'accessToken';
const ACCESS_TOKEN_EXPIRES_AT_KEY = 'accessTokenExpiresAt';

let keytarPromise: Promise<KeytarApi | null> | null = null;

const loadKeytar = async (): Promise<KeytarApi | null> => {
  if (!keytarPromise) {
    keytarPromise = import('keytar')
      .then((mod) => (mod?.default ?? mod) as KeytarApi)
      .catch((error) => {
        console.warn('[membership-token-store] keytar not available', error);
        return null;
      });
  }
  return keytarPromise;
};

const withKeytar = async <T>(
  handler: (keytar: KeytarApi) => Promise<T>,
  fallback: T
): Promise<T> => {
  const keytar = await loadKeytar();
  if (!keytar) {
    return fallback;
  }
  try {
    return await handler(keytar);
  } catch (error) {
    console.error('[membership-token-store] keytar operation failed', error);
    return fallback;
  }
};

export const isSecureStorageAvailable = async (): Promise<boolean> => {
  const keytar = await loadKeytar();
  return Boolean(keytar);
};

export const getRefreshToken = async (): Promise<string | null> =>
  withKeytar((keytar) => keytar.getPassword(KEYTAR_SERVICE, REFRESH_TOKEN_KEY), null);

export const setRefreshToken = async (token: string): Promise<void> => {
  await withKeytar(
    (keytar) => keytar.setPassword(KEYTAR_SERVICE, REFRESH_TOKEN_KEY, token),
    undefined
  );
};

export const clearRefreshToken = async (): Promise<void> => {
  await withKeytar((keytar) => keytar.deletePassword(KEYTAR_SERVICE, REFRESH_TOKEN_KEY), false);
};

export const getAccessToken = async (): Promise<string | null> =>
  withKeytar((keytar) => keytar.getPassword(KEYTAR_SERVICE, ACCESS_TOKEN_KEY), null);

export const setAccessToken = async (token: string): Promise<void> => {
  await withKeytar(
    (keytar) => keytar.setPassword(KEYTAR_SERVICE, ACCESS_TOKEN_KEY, token),
    undefined
  );
};

export const getAccessTokenExpiresAt = async (): Promise<string | null> =>
  withKeytar((keytar) => keytar.getPassword(KEYTAR_SERVICE, ACCESS_TOKEN_EXPIRES_AT_KEY), null);

export const setAccessTokenExpiresAt = async (expiresAt: string): Promise<void> => {
  await withKeytar(
    (keytar) => keytar.setPassword(KEYTAR_SERVICE, ACCESS_TOKEN_EXPIRES_AT_KEY, expiresAt),
    undefined
  );
};

export const clearAccessToken = async (): Promise<void> => {
  await withKeytar((keytar) => keytar.deletePassword(KEYTAR_SERVICE, ACCESS_TOKEN_KEY), false);
  await withKeytar(
    (keytar) => keytar.deletePassword(KEYTAR_SERVICE, ACCESS_TOKEN_EXPIRES_AT_KEY),
    false
  );
};

export const clearAccessTokenExpiresAt = async (): Promise<void> => {
  await withKeytar(
    (keytar) => keytar.deletePassword(KEYTAR_SERVICE, ACCESS_TOKEN_EXPIRES_AT_KEY),
    false
  );
};
