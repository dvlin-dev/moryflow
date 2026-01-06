/**
 * [PROVIDES]: useAuthStore, getAuthUser, getAccessToken
 * [DEPENDS]: zustand
 * [POS]: Console 端认证状态管理（内存 access token）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { create } from 'zustand';
import type { AuthUser } from '@aiget/auth-client';

/** 认证状态 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  setSession: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (accessToken: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  clearSession: () => void;
  setBootstrapped: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapped: false,

  /** 设置认证信息 */
  setSession: (user, accessToken) =>
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isBootstrapped: true,
    }),

  setAccessToken: (accessToken) =>
    set((state) => ({
      accessToken,
      isAuthenticated: Boolean(accessToken),
      user: accessToken ? state.user : null,
      isBootstrapped: true,
    })),

  setUser: (user) =>
    set((state) => ({
      user,
      isAuthenticated: Boolean(state.accessToken),
      isBootstrapped: true,
    })),

  /** 清除认证信息 */
  clearSession: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isBootstrapped: true,
    }),

  setBootstrapped: (value) => set({ isBootstrapped: value }),
}));

/** 获取当前用户 */
export const getAuthUser = () => useAuthStore.getState().user;

/** 获取当前 access token */
export const getAccessToken = () => useAuthStore.getState().accessToken;
