/**
 * [PROVIDES]: 认证状态管理
 * [DEPENDS]: zustand, @/types
 * [POS]: 管理员认证状态 Store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CurrentAdmin } from '@/types';

interface AuthState {
  admin: CurrentAdmin | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAdmin: (admin: CurrentAdmin | null) => void;
  setAccessToken: (accessToken: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      setAdmin: (admin) =>
        set({
          admin,
          isAuthenticated: !!admin,
          isLoading: false,
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () =>
        set({
          admin: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
