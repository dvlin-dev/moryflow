/**
 * [PROVIDES]: authStore, useAuthStore, access token helpers
 * [DEPENDS]: zustand (vanilla + middleware), desktopAPI IPC
 * [POS]: Desktop 端 access token 单一数据源（安全存储 + 预刷新）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export const AUTH_STORAGE_KEY = 'mf_auth_session';
export const ACCESS_TOKEN_SKEW_MS = 60 * 1000;

type AuthState = {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  lastUpdatedAt: string | null;
  isHydrated: boolean;
  setAccessToken: (token: string, expiresAt: string | null) => void;
  clearAccessToken: () => void;
  setHydrated: (hydrated: boolean) => void;
};

type PersistedAuthState = Pick<AuthState, 'accessToken' | 'accessTokenExpiresAt'>;

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const buildPersistedPayload = (state: PersistedAuthState): string =>
  JSON.stringify({ state, version: 1 });

const parsePersistedState = (value: string | null): PersistedAuthState | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { state?: PersistedAuthState } | null;
    return parsed?.state ?? null;
  } catch {
    return null;
  }
};

const storage: StateStorage = {
  getItem: async () => {
    const api = window.desktopAPI?.membership;
    if (!api?.getAccessToken || !api?.getAccessTokenExpiresAt) {
      return null;
    }
    const [accessToken, accessTokenExpiresAt] = await Promise.all([
      api.getAccessToken(),
      api.getAccessTokenExpiresAt(),
    ]);
    if (!accessToken) {
      return null;
    }
    return buildPersistedPayload({ accessToken, accessTokenExpiresAt });
  },
  setItem: async (_name, value) => {
    const api = window.desktopAPI?.membership;
    if (!api?.setAccessToken || !api?.setAccessTokenExpiresAt || !api?.clearAccessToken) {
      return;
    }
    const payload = parsePersistedState(value);
    if (!payload?.accessToken) {
      await api.clearAccessToken();
      return;
    }
    await api.setAccessToken(payload.accessToken);
    if (payload.accessTokenExpiresAt) {
      await api.setAccessTokenExpiresAt(payload.accessTokenExpiresAt);
    } else {
      await api.clearAccessTokenExpiresAt?.();
    }
  },
  removeItem: async () => {
    const api = window.desktopAPI?.membership;
    await api?.clearAccessToken?.();
  },
};

const resolveStorage = (): StateStorage => {
  if (typeof window === 'undefined') {
    return noopStorage;
  }
  return storage;
};

const createStorage = createJSONStorage<PersistedAuthState>(resolveStorage);

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
      storage: createStorage,
      partialize: (state): PersistedAuthState => ({
        accessToken: state.accessToken,
        accessTokenExpiresAt: state.accessTokenExpiresAt,
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
