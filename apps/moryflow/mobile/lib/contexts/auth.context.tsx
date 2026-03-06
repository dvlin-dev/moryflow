/**
 * [PROVIDES]: useAuth/useSignIn/useUser 兼容接口（无 Provider）
 * [DEPENDS]: useMembership/useMembershipAuth
 * [POS]: 认证 Hook 兼容层
 */

import { useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { useMembership, useMembershipAuth, isAuthError, type UserInfo } from '@/lib/server';

// ── 类型定义 ─────────────────────────────────────────────

export type SignInStrategy = 'password' | 'code' | 'apple';

export interface SignInCredentials {
  strategy: SignInStrategy;
  email?: string;
  password?: string;
  code?: string;
  appleToken?: string;
  appleId?: string;
  fullName?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
}

// ── Hooks ────────────────────────────────────────────────

/**
 * 使用认证状态
 */
export function useAuth() {
  const { user, isAuthenticated, isInitializing } = useMembership();
  const { login, register, logout, isLoading: isSubmitting } = useMembershipAuth();

  const signIn = useCallback(
    async (credentials: SignInCredentials, returnTo?: string) => {
      if (credentials.strategy !== 'password') {
        throw new Error(`暂不支持 ${credentials.strategy} 登录方式`);
      }

      if (!credentials.email || !credentials.password) {
        throw new Error('请输入邮箱和密码');
      }

      try {
        await login(credentials.email, credentials.password);
      } catch (error) {
        if (isAuthError(error) && error.code === 'EMAIL_NOT_VERIFIED') {
          router.replace({
            pathname: '/(auth)/verify-email',
            params: { email: credentials.email, mode: 'signin' },
          });
          return;
        }
        throw error;
      }

      // 登录成功后导航
      if (returnTo) {
        router.replace(returnTo as never);
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    },
    [login]
  );

  const signUp = useCallback(
    async (data: SignUpData) => {
      await register(data.email, data.password, data.name);

      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: data.email, mode: 'signup' },
      });
    },
    [register]
  );

  const signOut = useCallback(async () => {
    await logout();
    router.replace('/(auth)/sign-in');
  }, [logout]);

  return useMemo(
    () => ({
      user,
      isLoaded: !isInitializing,
      isSignedIn: isAuthenticated,
      isLoading: isSubmitting,
      signIn,
      signUp,
      signOut,
    }),
    [user, isInitializing, isAuthenticated, isSubmitting, signIn, signUp, signOut]
  );
}

/**
 * 使用登录功能
 */
export function useSignIn() {
  const { login, isLoading } = useMembershipAuth();

  const signIn = useCallback(
    async (credentials: SignInCredentials) => {
      if (credentials.strategy !== 'password') {
        throw new Error(`暂不支持 ${credentials.strategy} 登录方式`);
      }

      if (!credentials.email || !credentials.password) {
        throw new Error('请输入邮箱和密码');
      }

      try {
        await login(credentials.email, credentials.password);
      } catch (error) {
        if (isAuthError(error) && error.code === 'EMAIL_NOT_VERIFIED') {
          router.replace({
            pathname: '/(auth)/verify-email',
            params: { email: credentials.email, mode: 'signin' },
          });
          return;
        }
        throw error;
      }

      // 登录成功后导航
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    },
    [login]
  );

  return {
    signIn,
    isLoaded: true,
    isLoading,
  };
}

/**
 * 使用用户信息
 */
export function useUser() {
  const { user, isAuthenticated, isInitializing, refresh } = useMembership();

  return {
    user,
    isLoaded: !isInitializing,
    isSignedIn: isAuthenticated,
    reload: refresh,
  };
}

// ── 类型导出 ─────────────────────────────────────────────

export type { UserInfo as User };
