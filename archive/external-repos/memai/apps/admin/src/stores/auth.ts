/**
 * [PROVIDES]: useAuthStore, getAuthUser, getAuthToken, User
 * [DEPENDS]: zustand, zustand/middleware (persist)
 * [POS]: Admin authentication state management - stores admin user and token in localStorage
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/admin/CLAUDE.md
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'memory-admin-auth',
    },
  ),
);

/** 获取当前用户 */
export const getAuthUser = () => useAuthStore.getState().user;

/** 获取当前 token */
export const getAuthToken = () => useAuthStore.getState().token;
