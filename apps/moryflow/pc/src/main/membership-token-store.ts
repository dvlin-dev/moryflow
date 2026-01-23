/**
 * [PROVIDES]: refresh token 加密存储
 * [DEPENDS]: electron safeStorage, electron-store
 * [POS]: Desktop 端 refresh token 存储
 */

import { safeStorage } from 'electron';
import Store from 'electron-store';

const store = new Store({ name: 'membership-auth' });
const REFRESH_TOKEN_KEY = 'refreshToken';

export const getRefreshToken = (): string | null => {
  const encrypted = store.get(REFRESH_TOKEN_KEY);
  if (!encrypted || !(encrypted instanceof Buffer)) {
    return null;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[membership-token-store] encryption not available');
    return null;
  }

  try {
    return safeStorage.decryptString(encrypted);
  } catch (error) {
    console.error('[membership-token-store] decrypt failed', error);
    return null;
  }
};

export const setRefreshToken = (token: string): void => {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[membership-token-store] encryption not available, skipping persist');
    return;
  }

  const encrypted = safeStorage.encryptString(token);
  store.set(REFRESH_TOKEN_KEY, encrypted);
};

export const clearRefreshToken = (): void => {
  store.delete(REFRESH_TOKEN_KEY);
};
