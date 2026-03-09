/**
 * [PROVIDES]: authMethods（bootstrap/login/logout/refresh/refreshModels/会员开关）
 * [DEPENDS]: auth-store, auth-session, auth-api, server/api
 * [POS]: PC Renderer Auth 编排层（唯一可同时触达状态与请求）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { toast } from 'sonner';
import { exchangeGoogleCode, signInWithEmail, startGoogleSignIn } from './auth-api';
import {
  clearAuthSession,
  ensureAccessToken,
  getAccessToken,
  logoutFromServer,
  shouldClearAuthSessionAfterEnsureFailure,
} from './auth-session';
import { fetchCurrentUser, fetchMembershipModels, ServerApiError } from './api';
import { authStore, waitForAuthHydration } from './auth-store';
import type { MembershipModel, MembershipThinkingProfile, UserInfo } from './types';

const MEMBERSHIP_ENABLED_KEY = 'moryflow_membership_enabled';
const USER_INFO_KEY = 'moryflow_user_info';
const GOOGLE_OAUTH_TIMEOUT_MS = 120_000;

let bootstrapPromise: Promise<boolean> | null = null;
let listenersBound = false;
let secureStorageChecked = false;
let pendingGoogleOAuthNonce: string | null = null;

const shouldUseOAuthLoopbackCallback = (): boolean => {
  return import.meta.env.DEV;
};

const shouldRetryGoogleStartWithoutLoopback = (input: {
  attemptedLoopback: boolean;
  error?: {
    code?: string;
    message?: string;
  };
}): boolean => {
  if (!input.attemptedLoopback || !input.error) {
    return false;
  }

  const message = input.error.message?.trim().toLowerCase();
  return message === 'invalid oauth redirect uri';
};

const getStoredUserInfo = (): UserInfo | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(USER_INFO_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserInfo;
  } catch {
    return null;
  }
};

const setStoredUserInfo = (user: UserInfo | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (user) {
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
      return;
    }
    window.localStorage.removeItem(USER_INFO_KEY);
  } catch {
    // ignore
  }
};

const getStoredMembershipEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return window.localStorage.getItem(MEMBERSHIP_ENABLED_KEY) !== 'false';
  } catch {
    return true;
  }
};

const syncEnabledToMain = (enabled: boolean): void => {
  window.desktopAPI?.membership?.syncEnabled?.(enabled).catch((error) => {
    console.error('[auth-methods] Failed to sync membership enabled:', error);
  });
};

const setMembershipEnabledState = (enabled: boolean): void => {
  authStore.getState().setMembershipEnabled(enabled);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MEMBERSHIP_ENABLED_KEY, String(enabled));
    } catch {
      // ignore
    }
  }

  syncEnabledToMain(enabled);
};

const setUserState = (user: UserInfo | null): void => {
  authStore.getState().setUser(user);
  setStoredUserInfo(user);
};

const clearUserState = (): void => {
  setUserState(null);
  authStore.getState().setModels([]);
};

const normalizeMembershipThinkingProfile = (input: {
  modelId: string;
  profile: unknown;
}): MembershipThinkingProfile => {
  const record =
    input.profile && typeof input.profile === 'object'
      ? (input.profile as Record<string, unknown>)
      : null;
  if (!record) {
    throw new Error(`Model '${input.modelId}' missing thinking_profile`);
  }

  const rawLevels = Array.isArray(record.levels) ? record.levels : [];
  const levels: MembershipThinkingProfile['levels'] = [];
  const seen = new Set<string>();
  for (const item of rawLevels) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const level = item as Record<string, unknown>;
    const id = typeof level.id === 'string' ? level.id.trim() : '';
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const label =
      typeof level.label === 'string' && level.label.trim().length > 0 ? level.label.trim() : id;
    const description =
      typeof level.description === 'string' && level.description.trim().length > 0
        ? level.description.trim()
        : undefined;
    const visibleParamsRaw = Array.isArray(level.visibleParams) ? level.visibleParams : [];
    const visibleParams: NonNullable<MembershipThinkingProfile['levels'][number]['visibleParams']> =
      [];
    const seenParams = new Set<string>();
    for (const paramItem of visibleParamsRaw) {
      if (!paramItem || typeof paramItem !== 'object') {
        continue;
      }
      const param = paramItem as Record<string, unknown>;
      const key = typeof param.key === 'string' ? param.key.trim() : '';
      const value = typeof param.value === 'string' ? param.value.trim() : '';
      if (!key || !value || seenParams.has(key)) {
        continue;
      }
      seenParams.add(key);
      visibleParams.push({ key, value });
    }
    levels.push({
      id,
      label,
      ...(description ? { description } : {}),
      ...(visibleParams.length > 0 ? { visibleParams } : {}),
    });
  }

  if (!levels.some((level) => level.id === 'off')) {
    throw new Error(`Model '${input.modelId}' thinking_profile.levels must include 'off'`);
  }

  const defaultLevel = typeof record.defaultLevel === 'string' ? record.defaultLevel.trim() : '';
  if (!defaultLevel || !levels.some((level) => level.id === defaultLevel)) {
    throw new Error(`Model '${input.modelId}' thinking_profile.defaultLevel is invalid`);
  }

  const supportsThinking = Boolean(record.supportsThinking);
  return {
    supportsThinking,
    defaultLevel,
    levels,
  };
};

const loadModels = async (force = false): Promise<void> => {
  const { models } = authStore.getState();
  if (models.length > 0 && !force) {
    return;
  }

  authStore.getState().setModelsLoading(true);
  try {
    const response = await fetchMembershipModels();
    const membershipModels: MembershipModel[] = response.data
      .map((model) => {
        try {
          return {
            id: model.id,
            name: model.display_name || model.id,
            ownedBy: model.owned_by,
            minTier: model.min_tier,
            available: model.available,
            thinkingProfile: normalizeMembershipThinkingProfile({
              modelId: model.id,
              profile: model.thinking_profile,
            }),
          };
        } catch (error) {
          console.error('[auth-methods] Invalid membership model thinking_profile', {
            modelId: model.id,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      })
      .filter((model): model is MembershipModel => model !== null);
    authStore.getState().setModels(membershipModels);
  } catch (error) {
    console.error('[auth-methods] Failed to load models:', error);
  } finally {
    authStore.getState().setModelsLoading(false);
  }
};

const checkSecureStorageOnce = async (): Promise<void> => {
  if (secureStorageChecked) {
    return;
  }

  secureStorageChecked = true;
  const available = await window.desktopAPI?.membership?.isSecureStorageAvailable?.();
  if (available === false) {
    toast.error('Secure storage is unavailable. Please enable system keychain to sign in.');
  }
};

const bindLifecycleListeners = (): void => {
  if (listenersBound || typeof window === 'undefined') {
    return;
  }

  listenersBound = true;
  const handleResume = () => {
    void ensureAccessToken();
  };
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      handleResume();
    }
  };

  window.addEventListener('focus', handleResume);
  document.addEventListener('visibilitychange', handleVisibility);
};

const createGoogleOAuthNonce = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

type GoogleOAuthCallbackPayload = {
  code: string;
  nonce: string;
};

type GoogleOAuthCallbackWaiter = {
  promise: Promise<GoogleOAuthCallbackPayload>;
  dispose: () => void;
};

const createGoogleOAuthCallbackWaiter = (expectedNonce: string): GoogleOAuthCallbackWaiter => {
  const onOAuthCallback = window.desktopAPI?.membership?.onOAuthCallback;
  if (!onOAuthCallback) {
    throw new Error('OAuth callback channel is unavailable');
  }

  let settled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribe: () => void = () => undefined;

  const cleanup = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    unsubscribe();
  };

  const promise = new Promise<GoogleOAuthCallbackPayload>((resolve, reject) => {
    const finalizeSuccess = (value: GoogleOAuthCallbackPayload) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(value);
    };

    const finalizeError = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    };

    unsubscribe = onOAuthCallback((payload) => {
      if (!payload || typeof payload.code !== 'string' || typeof payload.nonce !== 'string') {
        return;
      }

      if (payload.nonce !== expectedNonce) {
        finalizeError(new Error('Invalid oauth callback state'));
        return;
      }

      finalizeSuccess(payload);
    });

    timer = setTimeout(() => {
      finalizeError(new Error('Google sign in timed out'));
    }, GOOGLE_OAUTH_TIMEOUT_MS);
  });

  return {
    promise,
    dispose: () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
    },
  };
};

const loadUser = async (preferCachedUser: boolean): Promise<boolean> => {
  await waitForAuthHydration();
  authStore.getState().setLoading(true);

  const cachedUser = getStoredUserInfo();
  let hasEstablishedSession = Boolean(cachedUser);

  if (preferCachedUser && cachedUser) {
    setUserState(cachedUser);
    void loadModels();
    authStore.getState().setLoading(false);
  }

  const refreshed = await ensureAccessToken();
  const token = getAccessToken();

  if (!refreshed || !token) {
    const shouldClear = await shouldClearAuthSessionAfterEnsureFailure();
    if (shouldClear) {
      await clearAuthSession();
      clearUserState();
      hasEstablishedSession = false;
    }
    authStore.getState().setLoading(false);
    return hasEstablishedSession;
  }

  try {
    const userInfo = await fetchCurrentUser();
    setUserState(userInfo);
    hasEstablishedSession = true;
    if (!cachedUser || !preferCachedUser) {
      void loadModels();
    }
  } catch (error) {
    console.error('[auth-methods] Failed to load user info:', error);
    if (error instanceof ServerApiError && error.isUnauthorized) {
      await clearAuthSession();
      clearUserState();
      hasEstablishedSession = false;
    }
  } finally {
    authStore.getState().setLoading(false);
  }

  return hasEstablishedSession;
};

export const authMethods = {
  async bootstrapAuth(): Promise<boolean> {
    if (!bootstrapPromise) {
      bootstrapPromise = (async () => {
        setMembershipEnabledState(getStoredMembershipEnabled());
        bindLifecycleListeners();
        await checkSecureStorageOnce();
        return loadUser(true);
      })().finally(() => {
        bootstrapPromise = null;
      });
    }

    return bootstrapPromise;
  },

  async login(email: string, password: string): Promise<void> {
    const result = await signInWithEmail(email.trim(), password);
    if (!result || result.error) {
      throw new Error(result?.error?.message || 'Login failed');
    }
    const established = await authMethods.refresh();
    if (!established) {
      await clearAuthSession();
      clearUserState();
      throw new Error('Failed to establish session');
    }
  },

  async loginWithGoogle(): Promise<void> {
    if (pendingGoogleOAuthNonce) {
      throw new Error('Google sign in is already in progress');
    }

    const nonce = createGoogleOAuthNonce();
    pendingGoogleOAuthNonce = nonce;
    let callbackWaiter: GoogleOAuthCallbackWaiter | null = null;
    const membershipApi = window.desktopAPI?.membership;
    const startOAuthCallbackLoopback = shouldUseOAuthLoopbackCallback()
      ? membershipApi?.startOAuthCallbackLoopback
      : undefined;
    const stopOAuthCallbackLoopback = shouldUseOAuthLoopbackCallback()
      ? membershipApi?.stopOAuthCallbackLoopback
      : undefined;
    let loopbackCallbackUrl: string | undefined;

    try {
      const loopbackHandle = await startOAuthCallbackLoopback?.();
      loopbackCallbackUrl = loopbackHandle?.callbackUrl ?? undefined;

      let startResult = await startGoogleSignIn(nonce, loopbackCallbackUrl);
      if (
        shouldRetryGoogleStartWithoutLoopback({
          attemptedLoopback: Boolean(loopbackCallbackUrl),
          error: startResult?.error,
        })
      ) {
        await stopOAuthCallbackLoopback?.().catch((error) => {
          console.error('[auth-methods] Failed to stop rejected oauth loopback:', error);
        });
        loopbackCallbackUrl = undefined;
        startResult = await startGoogleSignIn(nonce);
      }
      if (!startResult?.url || startResult.error) {
        throw new Error(startResult?.error?.message || 'Failed to start Google sign in');
      }

      callbackWaiter = createGoogleOAuthCallbackWaiter(nonce);
      const openExternal = membershipApi?.openExternal;
      if (!openExternal) {
        throw new Error('Open external is unavailable');
      }

      await openExternal(startResult.url);
      const callback = await callbackWaiter.promise;

      const exchangeResult = await exchangeGoogleCode(callback.code, callback.nonce);
      if (!exchangeResult || exchangeResult.error) {
        throw new Error(exchangeResult?.error?.message || 'Google sign in failed');
      }

      const established = await authMethods.refresh();
      if (!established) {
        await clearAuthSession();
        clearUserState();
        throw new Error('Failed to establish session');
      }
    } finally {
      callbackWaiter?.dispose();
      await stopOAuthCallbackLoopback?.().catch((error) => {
        console.error('[auth-methods] Failed to stop oauth loopback:', error);
      });
      if (pendingGoogleOAuthNonce === nonce) {
        pendingGoogleOAuthNonce = null;
      }
    }
  },

  async logout(): Promise<void> {
    authStore.getState().setLoading(true);
    try {
      await logoutFromServer();
      await clearAuthSession();
      clearUserState();
    } finally {
      authStore.getState().setLoading(false);
    }
  },

  async refresh(): Promise<boolean> {
    return loadUser(false);
  },

  async refreshModels(): Promise<void> {
    return loadModels(true);
  },

  setMembershipEnabled(enabled: boolean): void {
    setMembershipEnabledState(enabled);
  },
};
