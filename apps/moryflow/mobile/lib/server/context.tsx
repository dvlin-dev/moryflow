/**
 * [PROVIDES]: MembershipProvider 与认证/模型 hooks（含 Resume 校验）
 * [DEPENDS]: server/api, auth-session, auth-store, storage, AppState
 * [POS]: Mobile 端会员认证与模型状态中心
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
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
  logoutFromServer,
} from './auth-session';
import { createTempUserInfo, convertApiModels } from './helper';
import type { UserInfo, MembershipModel } from './types';
import { authStore, waitForAuthHydration } from './auth-store';

// ── Context 定义 ─────────────────────────────────────────

export class AuthError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export const isAuthError = (error: unknown): error is AuthError => error instanceof AuthError;

interface MembershipContextValue {
  // 用户状态
  user: UserInfo | null;
  isAuthenticated: boolean;

  // 加载状态
  isInitializing: boolean; // 初始化加载（启动时）
  isSubmitting: boolean; // 操作加载（登录/注册/登出）

  // 模型状态
  models: MembershipModel[];
  modelsLoading: boolean;

  // 认证方法
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  getPendingSignup: () => { email: string; password: string } | null;
  clearPendingSignup: () => void;

  // 模型方法
  refreshModels: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────

export function MembershipProvider({ children }: { children: ReactNode }) {
  // 用户状态
  const [user, setUserState] = useState<UserInfo | null>(null);

  // 加载状态
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 模型状态
  const [models, setModels] = useState<MembershipModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const getPendingSignup = useCallback(() => pendingSignup, [pendingSignup]);
  const clearPendingSignup = useCallback(() => setPendingSignup(null), []);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // 设置用户并同步缓存
  const setUser = useCallback((newUser: UserInfo | null) => {
    setUserState(newUser);
    setStoredUserCache(newUser);
  }, []);

  // 加载模型
  const loadModels = useCallback(
    async (force = false) => {
      if (models.length > 0 && !force) return;

      setModelsLoading(true);
      try {
        const response = await fetchMembershipModels();
        setModels(convertApiModels(response.data));
      } catch (err) {
        console.error('[Membership] Failed to load models:', err);
      } finally {
        setModelsLoading(false);
      }
    },
    [models.length]
  );

  // 从服务器加载用户信息
  const syncUserFromServer = useCallback(async () => {
    try {
      const userInfo = await fetchCurrentUser();
      setUser(userInfo);
      return true;
    } catch (error) {
      if (error instanceof ServerApiError && error.isUnauthorized) {
        // Token 无效，清除本地数据
        await clearAuthSession();
        await clearStoredUserCache();
        setUser(null);
        setModels([]);
      }
      return false;
    }
  }, [setModels, setUser]);

  // 初始化：从缓存恢复，后台同步
  const initialize = useCallback(async () => {
    await waitForAuthHydration();
    const refreshToken = await getStoredRefreshToken();
    const cachedUser = await getStoredUserCache();

    if (!refreshToken) {
      authStore.getState().clearAccessToken();
      await clearStoredUserCache();
      setUser(null);
      setModels([]);
      setIsInitializing(false);
      return;
    }

    // 有缓存则先使用缓存（快速显示）
    if (cachedUser) {
      setUser(cachedUser);
      setIsInitializing(false);
      loadModels();
      const refreshed = await ensureAccessToken();
      if (!refreshed) {
        await clearAuthSession();
        await clearStoredUserCache();
        setUser(null);
        setModels([]);
        return;
      }
      syncUserFromServer();
      return;
    }

    const refreshed = await ensureAccessToken();
    if (!refreshed) {
      await clearAuthSession();
      await clearStoredUserCache();
      setUser(null);
      setModels([]);
      setIsInitializing(false);
      return;
    }

    // 无缓存则等待服务器响应
    const success = await syncUserFromServer();
    if (success) {
      loadModels();
    }
    setIsInitializing(false);
  }, [loadModels, setModels, setUser, syncUserFromServer]);

  // 启动时初始化
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        void ensureAccessToken();
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 同步会员配置到 Agent Runtime
  useEffect(() => {
    syncMembershipConfig(!!user);
  }, [user]);

  // 登录
  const login = useCallback(
    async (email: string, password: string) => {
      setIsSubmitting(true);
      try {
        const normalizedEmail = email.trim();
        const result = await signInWithEmail(normalizedEmail, password);

        if (result.error) {
          if (result.error.code === 'EMAIL_NOT_VERIFIED') {
            setPendingSignup({ email: normalizedEmail, password });
          }
          throw new AuthError(parseAuthError(result.error), result.error.code);
        }

        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          throw new AuthError('Unable to establish session', 'SESSION_EXPIRED');
        }

        clearPendingSignup();

        // 先使用临时用户信息快速显示，后台再同步完整数据
        const authUser = extractUser(result);
        if (authUser) {
          setUser(createTempUserInfo(authUser));
          loadModels();
        }

        await syncUserFromServer();
      } finally {
        setIsSubmitting(false);
      }
    },
    [clearPendingSignup, loadModels, setPendingSignup, setUser, syncUserFromServer]
  );

  // 注册（仅创建账户，等待邮箱验证）
  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      setIsSubmitting(true);
      try {
        const normalizedEmail = email.trim();
        const result = await signUpWithEmail(normalizedEmail, password, name);
        if (result.error) {
          throw new AuthError(parseAuthError(result.error), result.error.code);
        }

        setPendingSignup({ email: normalizedEmail, password });
      } finally {
        setIsSubmitting(false);
      }
    },
    [setPendingSignup]
  );

  // 登出
  const logout = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await logoutFromServer();
      await clearAuthSession();
      await clearStoredUserCache();
      clearPendingSignup();
      setUser(null);
      setModels([]);
    } finally {
      setIsSubmitting(false);
    }
  }, [clearPendingSignup, setModels, setUser]);

  // 刷新
  const refresh = useCallback(async () => {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      await clearAuthSession();
      await clearStoredUserCache();
      setUser(null);
      setModels([]);
      return;
    }
    await syncUserFromServer();
  }, [setModels, setUser, syncUserFromServer]);
  const refreshModels = useCallback(() => loadModels(true), [loadModels]);

  const value = useMemo<MembershipContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isInitializing,
      isSubmitting,
      models,
      modelsLoading,
      login,
      register,
      logout,
      refresh,
      getPendingSignup,
      clearPendingSignup,
      refreshModels,
    }),
    [
      user,
      isInitializing,
      isSubmitting,
      models,
      modelsLoading,
      login,
      register,
      logout,
      refresh,
      getPendingSignup,
      clearPendingSignup,
      refreshModels,
    ]
  );

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

// ── Hooks ────────────────────────────────────────────────

export function useMembership(): MembershipContextValue {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error('useMembership must be used within MembershipProvider');
  }
  return context;
}

/** 用户信息 Hook */
export function useMembershipUser() {
  const { user, isAuthenticated, isInitializing } = useMembership();
  return { user, isAuthenticated, isLoading: isInitializing };
}

/** 模型列表 Hook */
export function useMembershipModels() {
  const { models, modelsLoading, refreshModels } = useMembership();
  return { models, modelsLoading, refreshModels };
}

/** 认证操作 Hook */
export function useMembershipAuth() {
  const { login, register, logout, isSubmitting } = useMembership();
  return { login, register, logout, isLoading: isSubmitting };
}
