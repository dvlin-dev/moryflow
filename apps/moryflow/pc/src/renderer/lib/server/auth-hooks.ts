/**
 * [PROVIDES]: useAuth（基于 zustand + methods 的只读组合 Hook）
 * [DEPENDS]: auth-store, auth-methods
 * [POS]: 组件层消费 Auth 状态的桥接入口（无 Context）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
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
      logout: authMethods.logout,
      refresh: authMethods.refresh,
      refreshModels: authMethods.refreshModels,
      setMembershipEnabled: authMethods.setMembershipEnabled,
    }),
    [isLoading, membershipEnabled, models, modelsLoading, user]
  );
}
