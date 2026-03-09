/**
 * [PROVIDES]: useMembership/useMembershipAuth/useMembershipUser/useMembershipModels
 * [DEPENDS]: auth-store, auth-methods
 * [POS]: Mobile 端 Auth hooks 入口（基于 zustand，无 Context Provider）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useMemo } from 'react';
import type { MembershipModel, UserInfo } from './types';
import { useAuthStore } from './auth-store';
import { authMethods, AuthError, isAuthError } from './auth-methods';

interface MembershipContextValue {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isSubmitting: boolean;
  models: MembershipModel[];
  modelsLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string) => Promise<void>;
  verifyEmailSignUp: (
    email: string,
    otp: string
  ) => Promise<{ signupToken: string; signupTokenExpiresAt?: string }>;
  completeEmailSignUp: (signupToken: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  refreshModels: () => Promise<void>;
}

export function useMembership(): MembershipContextValue {
  const user = useAuthStore((state) => state.user);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const models = useAuthStore((state) => state.models);
  const modelsLoading = useAuthStore((state) => state.modelsLoading);

  return useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      isSubmitting,
      models,
      modelsLoading,
      login: authMethods.login,
      register: authMethods.register,
      verifyEmailSignUp: authMethods.verifyEmailSignUp,
      completeEmailSignUp: authMethods.completeEmailSignUp,
      logout: authMethods.logout,
      refresh: authMethods.refresh,
      refreshModels: authMethods.refreshModels,
    }),
    [isInitializing, isSubmitting, models, modelsLoading, user]
  );
}

export function useMembershipUser() {
  const { user, isAuthenticated, isInitializing } = useMembership();
  return { user, isAuthenticated, isLoading: isInitializing };
}

export function useMembershipModels() {
  const { models, modelsLoading, refreshModels } = useMembership();
  return { models, modelsLoading, refreshModels };
}

export function useMembershipAuth() {
  const { login, register, verifyEmailSignUp, completeEmailSignUp, logout, isSubmitting } =
    useMembership();
  return {
    login,
    register,
    verifyEmailSignUp,
    completeEmailSignUp,
    logout,
    isLoading: isSubmitting,
  };
}

export { AuthError, isAuthError };
