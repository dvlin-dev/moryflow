/**
 * [PROVIDES]: useAuth（基于 zustand + methods 的只读组合 Hook）
 * [DEPENDS]: auth-store, auth-methods
 * [POS]: 组件层消费 Auth 状态的桥接入口（无 Context）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useMemo } from 'react';
import { useAuthStore } from './auth-store';
import { authMethods } from './auth-methods';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const models = useAuthStore((state) => state.models);
  const modelsLoading = useAuthStore((state) => state.modelsLoading);
  const membershipEnabled = useAuthStore((state) => state.membershipEnabled);

  return useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      models,
      modelsLoading,
      membershipEnabled,
      login: authMethods.login,
      loginWithGoogle: authMethods.loginWithGoogle,
      logout: authMethods.logout,
      refresh: authMethods.refresh,
      refreshModels: authMethods.refreshModels,
      setMembershipEnabled: authMethods.setMembershipEnabled,
    }),
    [isLoading, membershipEnabled, models, modelsLoading, user]
  );
}
