import { createAuthClient } from 'better-auth/react'
import { emailOTPClient } from 'better-auth/client/plugins'
import { MEMBERSHIP_API_URL } from './const'

/** 本地存储的 token key */
const TOKEN_STORAGE_KEY = 'moryflow_auth_token'

/** 获取存储的 token */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

/** 存储 token */
export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

/** 清除存储的 token */
export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

/**
 * Better Auth 客户端
 * 使用 token 认证（适用于 Electron 跨域环境）
 */
export const authClient = createAuthClient({
  baseURL: MEMBERSHIP_API_URL,
  fetchOptions: {
    // 动态添加 Authorization header
    onRequest: (ctx) => {
      const token = getStoredToken()
      if (token) {
        ctx.headers.set('Authorization', `Bearer ${token}`)
      }
    },
  },
  plugins: [emailOTPClient()],
})

export const {
  signIn,
  signUp,
  signOut,
  emailOtp,
} = authClient
