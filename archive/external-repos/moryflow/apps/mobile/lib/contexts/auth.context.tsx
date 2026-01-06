/**
 * 认证上下文
 *
 * 基于 MembershipProvider 的认证状态管理
 * 提供与旧 API 兼容的接口
 */

import React, { useCallback, useMemo } from 'react'
import { router } from 'expo-router'
import {
  useMembership,
  useMembershipAuth,
  useMembershipUser,
  type UserInfo,
} from '@/lib/server'

// ── Provider（兼容层）────────────────────────────────────

/**
 * AuthProvider 兼容层
 * 实际的认证逻辑由外层的 MembershipProvider 处理
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// ── 类型定义 ─────────────────────────────────────────────

export type SignInStrategy = 'password' | 'code' | 'apple'

export interface SignInCredentials {
  strategy: SignInStrategy
  email?: string
  password?: string
  code?: string
  appleToken?: string
  appleId?: string
  fullName?: string
}

export interface SignUpData {
  email: string
  password: string
  name?: string
}

// ── Hooks ────────────────────────────────────────────────

/**
 * 使用认证状态
 */
export function useAuth() {
  const { user, isAuthenticated, isInitializing } = useMembership()
  const { login, register, logout, isLoading: isSubmitting } = useMembershipAuth()

  const signIn = useCallback(
    async (credentials: SignInCredentials, returnTo?: string) => {
      if (credentials.strategy !== 'password') {
        throw new Error(`暂不支持 ${credentials.strategy} 登录方式`)
      }

      if (!credentials.email || !credentials.password) {
        throw new Error('请输入邮箱和密码')
      }

      await login(credentials.email, credentials.password)

      // 登录成功后导航
      if (returnTo) {
        router.replace(returnTo as never)
      } else if (router.canGoBack()) {
        router.back()
      } else {
        router.replace('/')
      }
    },
    [login]
  )

  const signUp = useCallback(
    async (data: SignUpData, returnTo?: string) => {
      await register(data.email, data.password, data.name)

      // 注册成功后导航
      if (returnTo) {
        router.replace(returnTo as never)
      } else if (router.canGoBack()) {
        router.back()
      } else {
        router.replace('/')
      }
    },
    [register]
  )

  const signOut = useCallback(async () => {
    await logout()
    router.replace('/(auth)/sign-in')
  }, [logout])

  return useMemo(
    () => ({
      user,
      isLoaded: !isInitializing,
      isSignedIn: isAuthenticated,
      isLoading: isSubmitting,
      signIn,
      signUp,
      signOut,
    }),
    [user, isInitializing, isAuthenticated, isSubmitting, signIn, signUp, signOut]
  )
}

/**
 * 使用登录功能
 */
export function useSignIn() {
  const { login, isLoading } = useMembershipAuth()

  const signIn = useCallback(
    async (credentials: SignInCredentials) => {
      if (credentials.strategy !== 'password') {
        throw new Error(`暂不支持 ${credentials.strategy} 登录方式`)
      }

      if (!credentials.email || !credentials.password) {
        throw new Error('请输入邮箱和密码')
      }

      await login(credentials.email, credentials.password)

      // 登录成功后导航
      if (router.canGoBack()) {
        router.back()
      } else {
        router.replace('/')
      }
    },
    [login]
  )

  return {
    signIn,
    isLoaded: true,
    isLoading,
  }
}

/**
 * 使用用户信息
 */
export function useUser() {
  const { user, isAuthenticated, isInitializing, refresh } = useMembership()

  return {
    user,
    isLoaded: !isInitializing,
    isSignedIn: isAuthenticated,
    reload: refresh,
  }
}

// ── 类型导出 ─────────────────────────────────────────────

export type { UserInfo as User }
