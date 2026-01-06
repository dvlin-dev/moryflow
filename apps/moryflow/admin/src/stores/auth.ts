/**
 * 认证状态管理
 * 使用 Bearer Token 认证，token 和用户信息存储在 localStorage
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 用户信息 */
interface AuthUser {
  id: string
  email: string
  name?: string | null
  isAdmin: boolean
}

/** 认证状态 */
interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      /** 设置认证信息 */
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),

      /** 退出登录 */
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
)

/** 获取当前用户 */
export const getAuthUser = () => useAuthStore.getState().user

/** 获取当前 token */
export const getAuthToken = () => useAuthStore.getState().token
