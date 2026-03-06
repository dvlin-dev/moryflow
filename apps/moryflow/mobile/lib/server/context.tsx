/**
 * [PROVIDES]: useMembership/useMembershipAuth/useMembershipUser/useMembershipModels
 * [DEPENDS]: auth-store, auth-methods
 * [POS]: Mobile 端 Auth hooks 入口（基于 zustand，无 Context Provider）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
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
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  getPendingSignup: () => { email: string; password: string } | null;
  clearPendingSignup: () => void;
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
      logout: authMethods.logout,
      refresh: authMethods.refresh,
      getPendingSignup: authMethods.getPendingSignup,
      clearPendingSignup: authMethods.clearPendingSignup,
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
  const { login, register, logout, isSubmitting } = useMembership();
  return { login, register, logout, isLoading: isSubmitting };
}

export { AuthError, isAuthError };
