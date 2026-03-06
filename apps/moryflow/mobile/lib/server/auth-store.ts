/**
 * [PROVIDES]: authStore, useAuthStore, access token helpers (expiresAt nullable)
 * [DEPENDS]: zustand (vanilla + middleware), expo-secure-store
 * [POS]: Mobile 端 access token 单一数据源（持久化 + 预刷新）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { MembershipModel, UserInfo } from './types';

export const AUTH_STORAGE_KEY = 'mf_auth_session';
export const ACCESS_TOKEN_SKEW_MS = 60 * 60 * 1000;

type AuthState = {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  lastUpdatedAt: string | null;
  isHydrated: boolean;
  user: UserInfo | null;
  isInitializing: boolean;
  isSubmitting: boolean;
  models: MembershipModel[];
  modelsLoading: boolean;
  pendingSignup: { email: string; password: string } | null;
  setAccessToken: (token: string, expiresAt: string | null) => void;
  clearAccessToken: () => void;
  setHydrated: (hydrated: boolean) => void;
  setUser: (user: UserInfo | null) => void;
  setInitializing: (value: boolean) => void;
  setSubmitting: (value: boolean) => void;
  setModels: (models: MembershipModel[]) => void;
  setModelsLoading: (value: boolean) => void;
  setPendingSignup: (value: { email: string; password: string } | null) => void;
  clearMembershipState: () => void;
};

type PersistedAuthState = Pick<AuthState, 'accessToken' | 'accessTokenExpiresAt' | 'lastUpdatedAt'>;

const secureStorage: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};

const storage = createJSONStorage<PersistedAuthState>(() => secureStorage);

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
      user: null,
      isInitializing: true,
      isSubmitting: false,
      models: [],
      modelsLoading: false,
      pendingSignup: null,
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
      setUser: (user) => set({ user }),
      setInitializing: (value) => set({ isInitializing: value }),
      setSubmitting: (value) => set({ isSubmitting: value }),
      setModels: (models) => set({ models }),
      setModelsLoading: (value) => set({ modelsLoading: value }),
      setPendingSignup: (value) => set({ pendingSignup: value }),
      clearMembershipState: () =>
        set({
          user: null,
          models: [],
          pendingSignup: null,
        }),
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
