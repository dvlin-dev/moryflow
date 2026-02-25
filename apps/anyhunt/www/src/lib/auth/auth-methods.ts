/**
 * [PROVIDES]: authMethods（bootstrap/signIn/verify/refresh/ensure/logout）
 * [DEPENDS]: auth-api.ts, auth store
 * [POS]: WWW 认证业务编排层
 */

import {
  authStore,
  hasUsableAccessToken,
  isAccessTokenExpiringSoon,
  isRefreshTokenExpired,
  useAuthStore,
  waitForAuthHydration,
} from '@/stores/auth-store';
import {
  fetchCurrentUser,
  logoutByToken,
  refreshByToken,
  signInWithEmail,
  verifyEmailOtpAndCreateSession,
} from './auth-api';

let refreshPromise: Promise<boolean> | null = null;

const clearSession = () => {
  authStore.getState().clearSession();
};

const setBootstrapped = (bootstrapped: boolean) => {
  authStore.getState().setBootstrapped(bootstrapped);
};

export const getAccessToken = () => authStore.getState().accessToken;

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const state = authStore.getState();
      if (!state.refreshToken || isRefreshTokenExpired(state.refreshTokenExpiresAt)) {
        clearSession();
        return false;
      }

      try {
        const bundle = await refreshByToken(state.refreshToken);
        if (!bundle) {
          clearSession();
          return false;
        }

        authStore.getState().setTokenBundle(bundle);
        return true;
      } catch {
        // 网络失败不主动清 session
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function ensureAccessToken(): Promise<string | null> {
  const state = authStore.getState();
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
  await waitForAuthHydration();

  const state = authStore.getState();
  if (state.isBootstrapped) {
    return;
  }

  if (!state.refreshToken || isRefreshTokenExpired(state.refreshTokenExpiresAt)) {
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
        authStore.getState().setAuthenticated(false);
        setBootstrapped(true);
        return;
      }
      authStore.getState().setAuthenticated(true);
      setBootstrapped(true);
    }
  }

  const token = getAccessToken() ?? fallbackToken;
  if (!token) {
    authStore.getState().setAuthenticated(false);
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

    if (!user) {
      clearSession();
      setBootstrapped(true);
      return;
    }

    const nextState = authStore.getState();
    nextState.setUser(user);
    nextState.setAuthenticated(true);
    nextState.setBootstrapped(true);
  } catch {
    const fallbackState = authStore.getState();
    fallbackState.setAuthenticated(
      hasUsableAccessToken(fallbackState.accessToken, fallbackState.accessTokenExpiresAt)
    );
    fallbackState.setBootstrapped(true);
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const bundle = await signInWithEmail(email, password);
  authStore.getState().setTokenBundle(bundle);

  const user = await fetchCurrentUser(bundle.accessToken);
  if (!user) {
    clearSession();
    throw new Error('Failed to establish session');
  }

  const state = authStore.getState();
  state.setUser(user);
  state.setAuthenticated(true);
  state.setBootstrapped(true);
}

export async function verifyEmailOtp(email: string, otp: string): Promise<void> {
  const bundle = await verifyEmailOtpAndCreateSession(email, otp);
  authStore.getState().setTokenBundle(bundle);

  const user = await fetchCurrentUser(bundle.accessToken);
  if (!user) {
    clearSession();
    throw new Error('Failed to establish session');
  }

  const state = authStore.getState();
  state.setUser(user);
  state.setAuthenticated(true);
  state.setBootstrapped(true);
}

export async function logout(): Promise<void> {
  const { refreshToken } = authStore.getState();
  if (refreshToken) {
    await logoutByToken(refreshToken);
  }

  clearSession();
  setBootstrapped(true);
}

export const authMethods = {
  bootstrapAuth,
  signIn,
  verifyEmailOtp,
  refreshAccessToken,
  ensureAccessToken,
  logout,
};

export const useAuthState = <T>(selector: (state: ReturnType<typeof authStore.getState>) => T): T =>
  useAuthStore(selector);
