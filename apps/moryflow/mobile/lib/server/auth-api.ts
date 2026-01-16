/**
 * Better Auth API 封装
 *
 * 处理登录、注册、登出等认证相关的 API 调用
 */

import { MEMBERSHIP_API_URL } from '@anyhunt/api'
import type { BetterAuthError } from './types'

// ============ 类型定义 ============

export interface BetterAuthResponse {
  token?: string
  user?: { id: string; email: string; name?: string }
  error?: BetterAuthError
}

export interface AuthUser {
  id: string
  email: string
  name?: string
}

// ============ API 方法 ============

/**
 * 邮箱登录
 */
export async function signInWithEmail(email: string, password: string): Promise<BetterAuthResponse> {
  try {
    const response = await fetch(`${MEMBERSHIP_API_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: { code: data.code || 'UNKNOWN', message: data.message || 'Sign in failed' } }
    }

    return data
  } catch {
    return { error: { code: 'NETWORK_ERROR', message: 'Network connection failed' } }
  }
}

/**
 * 邮箱注册
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<BetterAuthResponse> {
  try {
    const response = await fetch(`${MEMBERSHIP_API_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: name || email.split('@')[0] }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: { code: data.code || 'UNKNOWN', message: data.message || 'Sign up failed' } }
    }

    return data
  } catch {
    return { error: { code: 'NETWORK_ERROR', message: 'Network connection failed' } }
  }
}

/**
 * 发送邮箱验证码
 */
export async function sendVerificationOTP(
  email: string,
  type: 'email-verification' | 'sign-in' | 'forget-password' = 'email-verification'
): Promise<{ error?: BetterAuthError }> {
  try {
    const response = await fetch(`${MEMBERSHIP_API_URL}/api/auth/email-otp/send-verification-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: { code: data.code || 'UNKNOWN', message: data.message || 'Failed to send' } }
    }

    return {}
  } catch {
    return { error: { code: 'NETWORK_ERROR', message: 'Network connection failed' } }
  }
}

/**
 * 验证邮箱
 */
export async function verifyEmailOTP(email: string, otp: string): Promise<{ error?: BetterAuthError }> {
  try {
    const response = await fetch(`${MEMBERSHIP_API_URL}/api/auth/email-otp/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: { code: data.code || 'UNKNOWN', message: data.message || 'Verification failed' } }
    }

    return {}
  } catch {
    return { error: { code: 'NETWORK_ERROR', message: 'Network connection failed' } }
  }
}

/**
 * 登出
 */
export async function signOutFromServer(token: string): Promise<void> {
  try {
    await fetch(`${MEMBERSHIP_API_URL}/api/auth/sign-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
  } catch (error) {
    // 登出失败不阻塞流程，但记录日志便于调试
    console.warn('[signOutFromServer] Sign out request failed:', error)
  }
}

// ============ 工具函数 ============

/**
 * 从响应中提取 token
 */
export function extractToken(response: BetterAuthResponse): string | null {
  return response.token || null
}

/**
 * 从响应中提取用户信息
 */
export function extractUser(response: BetterAuthResponse): AuthUser | null {
  return response.user || null
}
