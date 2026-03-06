/**
 * [PROVIDES]: authMethods（bootstrap/signIn/refresh/ensure/logout）
 * [DEPENDS]: auth-api.ts, auth store
 * [POS]: Admin 认证业务编排层
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import {
  getAccessToken,
  hasUsableAccessToken,
  isAccessTokenExpiringSoon,
  isExpired,
  useAuthStore,
} from '@/stores/auth';
import { fetchCurrentUser, logoutByToken, refreshByToken, signInWithEmail } from './auth-api';

let refreshPromise: Promise<boolean> | null = null;

const clearSession = () => {
  useAuthStore.getState().clearSession();
};

const setBootstrapped = (bootstrapped: boolean) => {
  useAuthStore.getState().setBootstrapped(bootstrapped);
};

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const state = useAuthStore.getState();
      if (!state.refreshToken || isExpired(state.refreshTokenExpiresAt)) {
        clearSession();
        return false;
      }

      try {
        const bundle = await refreshByToken(state.refreshToken);
        if (!bundle) {
          clearSession();
          return false;
        }

        useAuthStore.getState().setTokenBundle(bundle);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function ensureAccessToken(): Promise<string | null> {
  const state = useAuthStore.getState();
  if (state.accessToken && !isAccessTokenExpiringSoon(state.accessTokenExpiresAt)) {
    return state.accessToken;
  }

  const refreshed = await refreshAccessToken();
  if (refreshed) {
    return getAccessToken();
  }

  return hasUsableAccessToken(state.accessToken, state.accessTokenExpiresAt)
    ? state.accessToken
    : null;
}

export async function bootstrapAuth(): Promise<void> {
  const state = useAuthStore.getState();
  if (state.isBootstrapped) return;

  if (!state.refreshToken || isExpired(state.refreshTokenExpiresAt)) {
    clearSession();
    setBootstrapped(true);
    return;
  }

  const fallbackToken = hasUsableAccessToken(state.accessToken, state.accessTokenExpiresAt)
    ? state.accessToken
    : null;

  if (!fallbackToken || isAccessTokenExpiringSoon(state.accessTokenExpiresAt)) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      if (!fallbackToken) {
        useAuthStore.getState().setAuthenticated(false);
        setBootstrapped(true);
        return;
      }
      useAuthStore.getState().setAuthenticated(true);
      setBootstrapped(true);
    }
  }

  const token = getAccessToken() ?? fallbackToken;
  if (!token) {
    useAuthStore.getState().setAuthenticated(false);
    setBootstrapped(true);
    return;
  }

  try {
    let user = await fetchCurrentUser(token);
    if (!user) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryToken = getAccessToken();
        if (retryToken) {
          user = await fetchCurrentUser(retryToken);
        }
      }
    }

    if (!user || !user.isAdmin) {
      clearSession();
      setBootstrapped(true);
      return;
    }

    const nextState = useAuthStore.getState();
    nextState.setUser(user);
    nextState.setAuthenticated(true);
    nextState.setBootstrapped(true);
  } catch {
    const fallbackState = useAuthStore.getState();
    fallbackState.setAuthenticated(
      Boolean(fallbackState.user?.isAdmin) &&
        hasUsableAccessToken(fallbackState.accessToken, fallbackState.accessTokenExpiresAt)
    );
    fallbackState.setBootstrapped(true);
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const bundle = await signInWithEmail(email, password);
  useAuthStore.getState().setTokenBundle(bundle);

  const user = await fetchCurrentUser(bundle.accessToken);
  if (!user || !user.isAdmin) {
    clearSession();
    throw new Error('Admin access required');
  }

  const state = useAuthStore.getState();
  state.setUser(user);
  state.setAuthenticated(true);
  state.setBootstrapped(true);
}

export async function logout(): Promise<void> {
  const { refreshToken } = useAuthStore.getState();
  if (refreshToken) {
    await logoutByToken(refreshToken);
  }

  clearSession();
  setBootstrapped(true);
}

export const authMethods = {
  bootstrapAuth,
  signIn,
  refreshAccessToken,
  ensureAccessToken,
  logout,
};
