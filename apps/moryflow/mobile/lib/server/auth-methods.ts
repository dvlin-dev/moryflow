/**
 * [PROVIDES]: authMethods（bootstrap/login/register/logout/refresh）+ AuthError
 * [DEPENDS]: auth-store, auth-session, auth-api, server/api, membership-bridge
 * [POS]: Mobile Auth 编排层（唯一可同时触达状态与请求）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { AppState } from 'react-native';
import { parseAuthError } from '@anyhunt/api';
import {
  getStoredRefreshToken,
  getStoredUserCache,
  setStoredUserCache,
  clearStoredUserCache,
} from './storage';
import { syncMembershipConfig } from '@/lib/agent-runtime/membership-bridge';
import { fetchCurrentUser, fetchMembershipModels, ServerApiError } from './api';
import { signInWithEmail, signUpWithEmail, extractUser } from './auth-api';
import {
  ensureAccessToken,
  refreshAccessToken,
  clearAuthSession,
  shouldClearAuthSessionAfterEnsureFailure,
  logoutFromServer,
} from './auth-session';
import { createTempUserInfo, convertApiModels } from './helper';
import { authStore, waitForAuthHydration } from './auth-store';
import type { UserInfo } from './types';

type SyncUserResult = 'ok' | 'unauthorized' | 'transient';

let bootstrapPromise: Promise<void> | null = null;
let appState = AppState.currentState;
let appStateSubscription: { remove: () => void } | null = null;

export class AuthError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export const isAuthError = (error: unknown): error is AuthError => error instanceof AuthError;

const setUserState = (user: UserInfo | null): void => {
  authStore.getState().setUser(user);
  void setStoredUserCache(user);
  syncMembershipConfig(Boolean(user));
};

const clearMembershipState = async (): Promise<void> => {
  authStore.getState().clearMembershipState();
  await clearStoredUserCache();
  syncMembershipConfig(false);
};

const setPendingSignup = (value: { email: string; password: string } | null): void => {
  authStore.getState().setPendingSignup(value);
};

const loadModels = async (force = false): Promise<void> => {
  const { models } = authStore.getState();
  if (models.length > 0 && !force) {
    return;
  }

  authStore.getState().setModelsLoading(true);
  try {
    const response = await fetchMembershipModels();
    authStore.getState().setModels(convertApiModels(response.data));
  } catch (error) {
    console.error('[auth-methods] Failed to load models:', error);
  } finally {
    authStore.getState().setModelsLoading(false);
  }
};

const syncUserFromServer = async (): Promise<SyncUserResult> => {
  try {
    const userInfo = await fetchCurrentUser();
    setUserState(userInfo);
    return 'ok';
  } catch (error) {
    if (error instanceof ServerApiError && error.isUnauthorized) {
      await clearAuthSession();
      await clearMembershipState();
      return 'unauthorized';
    }
    return 'transient';
  }
};

const bindLifecycle = (): void => {
  if (appStateSubscription) {
    return;
  }

  appStateSubscription = AppState.addEventListener('change', (nextState) => {
    if (appState.match(/inactive|background/) && nextState === 'active') {
      void ensureAccessToken();
    }
    appState = nextState;
  });
};

const initialize = async (): Promise<void> => {
  await waitForAuthHydration();
  bindLifecycle();

  const refreshToken = await getStoredRefreshToken();
  const cachedUser = await getStoredUserCache();

  if (!refreshToken) {
    authStore.getState().clearAccessToken();
    await clearMembershipState();
    authStore.getState().setInitializing(false);
    return;
  }

  if (cachedUser) {
    setUserState(cachedUser);
    authStore.getState().setInitializing(false);
    void loadModels();

    const refreshed = await ensureAccessToken();
    if (!refreshed) {
      const shouldClear = await shouldClearAuthSessionAfterEnsureFailure();
      if (!shouldClear) {
        return;
      }
      await clearAuthSession();
      await clearMembershipState();
      return;
    }

    void syncUserFromServer();
    return;
  }

  const refreshed = await ensureAccessToken();
  if (!refreshed) {
    const shouldClear = await shouldClearAuthSessionAfterEnsureFailure();
    if (!shouldClear) {
      authStore.getState().setInitializing(false);
      return;
    }
    await clearAuthSession();
    await clearMembershipState();
    authStore.getState().setInitializing(false);
    return;
  }

  const syncResult = await syncUserFromServer();
  if (syncResult === 'ok') {
    void loadModels();
  }
  authStore.getState().setInitializing(false);
};

export const authMethods = {
  async bootstrapAuth(): Promise<void> {
    if (!bootstrapPromise) {
      bootstrapPromise = initialize().finally(() => {
        bootstrapPromise = null;
      });
    }
    return bootstrapPromise;
  },

  async login(email: string, password: string): Promise<void> {
    authStore.getState().setSubmitting(true);
    try {
      const normalizedEmail = email.trim();
      const result = await signInWithEmail(normalizedEmail, password);

      if (result.error) {
        if (result.error.code === 'EMAIL_NOT_VERIFIED') {
          setPendingSignup({ email: normalizedEmail, password });
        }
        throw new AuthError(parseAuthError(result.error), result.error.code);
      }

      authMethods.clearPendingSignup();

      const authUser = extractUser(result);
      if (authUser) {
        setUserState(createTempUserInfo(authUser));
        void loadModels();
      }

      const syncResult = await syncUserFromServer();
      if (syncResult === 'unauthorized') {
        throw new AuthError('Unable to establish session', 'SESSION_EXPIRED');
      }
    } finally {
      authStore.getState().setSubmitting(false);
    }
  },

  async register(email: string, password: string, name?: string): Promise<void> {
    authStore.getState().setSubmitting(true);
    try {
      const normalizedEmail = email.trim();
      const result = await signUpWithEmail(normalizedEmail, password, name);
      if (result.error) {
        throw new AuthError(parseAuthError(result.error), result.error.code);
      }
      setPendingSignup({ email: normalizedEmail, password });
    } finally {
      authStore.getState().setSubmitting(false);
    }
  },

  async logout(): Promise<void> {
    authStore.getState().setSubmitting(true);
    try {
      await logoutFromServer();
      await clearAuthSession();
      await clearMembershipState();
      authMethods.clearPendingSignup();
    } finally {
      authStore.getState().setSubmitting(false);
    }
  },

  async refresh(): Promise<boolean> {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      const shouldClear = await shouldClearAuthSessionAfterEnsureFailure();
      if (shouldClear) {
        await clearAuthSession();
        await clearMembershipState();
        return false;
      }
    }

    const syncResult = await syncUserFromServer();
    if (syncResult === 'ok') {
      return true;
    }

    if (syncResult === 'unauthorized') {
      return false;
    }

    const { user, accessToken } = authStore.getState();
    return Boolean(user || accessToken);
  },

  async refreshModels(): Promise<void> {
    return loadModels(true);
  },

  getPendingSignup(): { email: string; password: string } | null {
    return authStore.getState().pendingSignup;
  },

  clearPendingSignup(): void {
    setPendingSignup(null);
  },
};
