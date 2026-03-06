/**
 * [PROVIDES]: useAuthStore, getAuthUser, getAccessToken, auth state setters/helpers
 * [DEPENDS]: zustand
 * [POS]: Admin 端认证状态单一数据源（仅状态，不包含网络请求）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/** Admin 用户信息（来自 /api/v1/app/user/me） */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  subscriptionTier: string;
  isAdmin: boolean;
}

export type AuthTokenBundle = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  setUser: (user: AuthUser | null) => void;
  setTokenBundle: (bundle: AuthTokenBundle) => void;
  clearSession: () => void;
  setBootstrapped: (bootstrapped: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
}

type PersistedAuthState = Pick<
  AuthState,
  'user' | 'accessToken' | 'accessTokenExpiresAt' | 'refreshToken' | 'refreshTokenExpiresAt'
>;

type RehydratedAuthState = Pick<
  AuthState,
  'accessToken' | 'accessTokenExpiresAt' | 'refreshToken' | 'refreshTokenExpiresAt' | 'clearSession'
>;

export const AUTH_STORAGE_KEY = 'ah_admin_auth';
export const ACCESS_TOKEN_SKEW_MS = 60 * 60 * 1000;

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

export const parseExpiresAt = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  const timestamp = Date.parse(expiresAt);
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const isExpired = (expiresAt: string | null): boolean => {
  const timestamp = parseExpiresAt(expiresAt);
  if (!timestamp) return true;
  return timestamp <= Date.now();
};

export const isAccessTokenExpiringSoon = (expiresAt: string | null): boolean => {
  const timestamp = parseExpiresAt(expiresAt);
  if (!timestamp) return true;
  return timestamp - Date.now() <= ACCESS_TOKEN_SKEW_MS;
};

export const hasUsableAccessToken = (
  token: string | null,
  expiresAt: string | null
): token is string => Boolean(token && !isExpired(expiresAt));

export const reconcileRehydratedAuthState = (
  state: RehydratedAuthState,
  setState: (partial: Partial<AuthState>) => void
): void => {
  if (!state.refreshToken || isExpired(state.refreshTokenExpiresAt)) {
    state.clearSession();
    return;
  }

  if (isExpired(state.accessTokenExpiresAt)) {
    setState({
      accessToken: null,
      accessTokenExpiresAt: null,
    });
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      accessTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      isAuthenticated: false,
      isBootstrapped: false,
      setUser: (user) => set({ user }),
      setTokenBundle: (bundle) =>
        set({
          accessToken: bundle.accessToken,
          accessTokenExpiresAt: bundle.accessTokenExpiresAt,
          refreshToken: bundle.refreshToken,
          refreshTokenExpiresAt: bundle.refreshTokenExpiresAt,
          isAuthenticated: true,
        }),
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          accessTokenExpiresAt: null,
          refreshToken: null,
          refreshTokenExpiresAt: null,
          isAuthenticated: false,
        }),
      setBootstrapped: (bootstrapped) => set({ isBootstrapped: bootstrapped }),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
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
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        reconcileRehydratedAuthState(state, (partial) => {
          useAuthStore.setState(partial);
        });
      },
    }
  )
);

export const getAuthUser = () => useAuthStore.getState().user;
export const getAccessToken = () => useAuthStore.getState().accessToken;
