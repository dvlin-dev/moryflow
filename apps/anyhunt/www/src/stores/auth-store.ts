/**
 * [PROVIDES]: authStore, useAuthStore, auth helpers for token session state
 * [DEPENDS]: zustand (vanilla + middleware)
 * [POS]: www auth state single source of truth（access/refresh + user + bootstrap）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export const AUTH_STORAGE_KEY = 'ah_auth_session';
export const ACCESS_TOKEN_SKEW_MS = 60 * 60 * 1000;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

export type AuthTokenBundle = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  lastUpdatedAt: string | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  setUser: (user: AuthUser | null) => void;
  setTokenBundle: (bundle: AuthTokenBundle) => void;
  clearAccessToken: () => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setBootstrapped: (bootstrapped: boolean) => void;
};

type PersistedAuthState = Pick<
  AuthState,
  | 'user'
  | 'accessToken'
  | 'accessTokenExpiresAt'
  | 'refreshToken'
  | 'refreshTokenExpiresAt'
  | 'lastUpdatedAt'
>;

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

export const isRefreshTokenExpired = (expiresAt: string | null): boolean => {
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

export const hasUsableAccessToken = (
  token: string | null,
  expiresAt: string | null
): token is string => Boolean(token && !isAccessTokenExpired(expiresAt));

export const authStore = createStore<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      accessTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      lastUpdatedAt: null,
      isHydrated: false,
      isAuthenticated: false,
      isBootstrapped: false,
      setUser: (user) => set({ user }),
      setTokenBundle: (bundle) =>
        set({
          accessToken: bundle.accessToken,
          accessTokenExpiresAt: bundle.accessTokenExpiresAt,
          refreshToken: bundle.refreshToken,
          refreshTokenExpiresAt: bundle.refreshTokenExpiresAt,
          lastUpdatedAt: new Date().toISOString(),
          isAuthenticated: true,
        }),
      clearAccessToken: () =>
        set({
          accessToken: null,
          accessTokenExpiresAt: null,
          lastUpdatedAt: new Date().toISOString(),
          isAuthenticated: false,
        }),
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          accessTokenExpiresAt: null,
          refreshToken: null,
          refreshTokenExpiresAt: null,
          lastUpdatedAt: null,
          isAuthenticated: false,
        }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      setBootstrapped: (bootstrapped) => set({ isBootstrapped: bootstrapped }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: 1,
      storage,
      partialize: (state): PersistedAuthState => ({
        user: state.user,
        accessToken: state.accessToken,
        accessTokenExpiresAt: state.accessTokenExpiresAt,
        refreshToken: state.refreshToken,
        refreshTokenExpiresAt: state.refreshTokenExpiresAt,
        lastUpdatedAt: state.lastUpdatedAt,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!state) return;

        if (error) {
          state.clearSession();
          state.setHydrated(true);
          return;
        }

        if (isRefreshTokenExpired(state.refreshTokenExpiresAt)) {
          state.clearSession();
          state.setHydrated(true);
          return;
        }

        if (isAccessTokenExpired(state.accessTokenExpiresAt)) {
          state.clearAccessToken();
        } else if (state.accessToken) {
          state.setAuthenticated(true);
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
