/**
 * [PROVIDES]: authStore, useAuthStore, auth helpers for access token state
 * [DEPENDS]: zustand (vanilla + middleware)
 * [POS]: www auth state single source of truth (access token + persistence)
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export const AUTH_STORAGE_KEY = 'ah_auth_session';
export const ACCESS_TOKEN_SKEW_MS = 60 * 1000;

type AuthState = {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  lastUpdatedAt: string | null;
  isHydrated: boolean;
  setAccessToken: (token: string, expiresAt: string) => void;
  clearAccessToken: () => void;
  setHydrated: (hydrated: boolean) => void;
};

type PersistedAuthState = Pick<AuthState, 'accessToken' | 'accessTokenExpiresAt' | 'lastUpdatedAt'>;

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const resolveStorage = (): StateStorage => {
  if (typeof window === 'undefined') {
    return noopStorage;
  }
  return window.localStorage;
};

const storage = createJSONStorage<PersistedAuthState>(resolveStorage);

const parseExpiresAt = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  const timestamp = Date.parse(expiresAt);
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const isAccessTokenExpired = (expiresAt: string | null): boolean => {
  const timestamp = parseExpiresAt(expiresAt);
  if (!timestamp) return true;
  return timestamp <= Date.now();
};

export const isAccessTokenExpiringSoon = (
  expiresAt: string | null,
  skewMs = ACCESS_TOKEN_SKEW_MS
): boolean => {
  const timestamp = parseExpiresAt(expiresAt);
  if (!timestamp) return true;
  return timestamp - Date.now() <= skewMs;
};

export const authStore = createStore<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      accessTokenExpiresAt: null,
      lastUpdatedAt: null,
      isHydrated: false,
      setAccessToken: (token, expiresAt) =>
        set({
          accessToken: token,
          accessTokenExpiresAt: expiresAt,
          lastUpdatedAt: new Date().toISOString(),
        }),
      clearAccessToken: () =>
        set({
          accessToken: null,
          accessTokenExpiresAt: null,
          lastUpdatedAt: null,
        }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: 1,
      storage,
      partialize: (state): PersistedAuthState => ({
        accessToken: state.accessToken,
        accessTokenExpiresAt: state.accessTokenExpiresAt,
        lastUpdatedAt: state.lastUpdatedAt,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!state) return;

        if (error) {
          state.clearAccessToken();
          state.setHydrated(true);
          return;
        }

        if (isAccessTokenExpired(state.accessTokenExpiresAt)) {
          state.clearAccessToken();
        }

        state.setHydrated(true);
      },
    }
  )
);

export const useAuthStore = <T>(selector: (state: AuthState) => T): T =>
  useStore(authStore, selector);

export const waitForAuthHydration = (): Promise<void> => {
  if (authStore.getState().isHydrated) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const unsubscribe = authStore.subscribe((state) => {
      if (state.isHydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
};
