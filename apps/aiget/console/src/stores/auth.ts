/**
 * [PROVIDES]: useAuthStore, getAuthUser
 * [DEPENDS]: zustand, better-auth
 * [POS]: Console 端认证状态管理（Better Auth Cookie 模式）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { create } from 'zustand';

/** Better Auth 用户类型 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 认证状态 */
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  setUser: (user: AuthUser | null) => void;
  clearSession: () => void;
  setBootstrapped: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isBootstrapped: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapped: true,
    }),

  clearSession: () =>
    set({
      user: null,
      isAuthenticated: false,
      isBootstrapped: true,
    }),

  setBootstrapped: (value) => set({ isBootstrapped: value }),
}));

/** 获取当前用户 */
export const getAuthUser = () => useAuthStore.getState().user;
