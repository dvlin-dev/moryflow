/**
 * Membership Context
 *
 * 会员系统状态管理
 * - 分离初始化状态和操作状态
 * - 支持缓存优先，后台同步
 * - Token 长期存储，直到过期
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { parseAuthError } from '@moryflow/shared-api'
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  getStoredUserCache,
  setStoredUserCache,
} from './storage'
import { syncMembershipConfig } from '@/lib/agent-runtime/membership-bridge'
import { fetchCurrentUser, fetchMembershipModels, ServerApiError } from './api'
import {
  signInWithEmail,
  signUpWithEmail,
  signOutFromServer,
  extractToken,
  extractUser,
} from './auth-api'
import { createTempUserInfo, convertApiModels } from './helper'
import type { UserInfo, MembershipModel } from './types'

// ── Context 定义 ─────────────────────────────────────────

interface MembershipContextValue {
  // 用户状态
  user: UserInfo | null
  isAuthenticated: boolean

  // 加载状态
  isInitializing: boolean // 初始化加载（启动时）
  isSubmitting: boolean   // 操作加载（登录/注册/登出）

  // 模型状态
  models: MembershipModel[]
  modelsLoading: boolean

  // 认证方法
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>

  // 模型方法
  refreshModels: () => Promise<void>
}

const MembershipContext = createContext<MembershipContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────

export function MembershipProvider({ children }: { children: ReactNode }) {
  // 用户状态
  const [user, setUserState] = useState<UserInfo | null>(null)

  // 加载状态
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 模型状态
  const [models, setModels] = useState<MembershipModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  // 设置用户并同步缓存
  const setUser = useCallback((newUser: UserInfo | null) => {
    setUserState(newUser)
    setStoredUserCache(newUser)
  }, [])

  // 加载模型
  const loadModels = useCallback(async (force = false) => {
    if (models.length > 0 && !force) return

    setModelsLoading(true)
    try {
      const response = await fetchMembershipModels()
      setModels(convertApiModels(response.data))
    } catch (err) {
      console.error('[Membership] Failed to load models:', err)
    } finally {
      setModelsLoading(false)
    }
  }, [models.length])

  // 从服务器加载用户信息
  const syncUserFromServer = useCallback(async () => {
    try {
      const userInfo = await fetchCurrentUser()
      setUser(userInfo)
      return true
    } catch (error) {
      if (error instanceof ServerApiError && error.isUnauthorized) {
        // Token 无效，清除本地数据
        await clearStoredToken()
        setUser(null)
        setModels([])
      }
      return false
    }
  }, [setUser])

  // 初始化：从缓存恢复，后台同步
  const initialize = useCallback(async () => {
    const token = await getStoredToken()
    const cachedUser = await getStoredUserCache()

    if (!token) {
      setUser(null)
      setIsInitializing(false)
      return
    }

    // 有缓存则先使用缓存（快速显示）
    if (cachedUser) {
      setUser(cachedUser)
      setIsInitializing(false)
      loadModels()
      // 后台静默同步
      syncUserFromServer()
    } else {
      // 无缓存则等待服务器响应
      const success = await syncUserFromServer()
      if (success) {
        loadModels()
      }
      setIsInitializing(false)
    }
  }, [setUser, loadModels, syncUserFromServer])

  // 启动时初始化
  useEffect(() => {
    initialize()
  }, [initialize])

  // 同步会员配置到 Agent Runtime
  useEffect(() => {
    syncMembershipConfig(!!user)
  }, [user])

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    setIsSubmitting(true)
    try {
      const result = await signInWithEmail(email, password)

      if (result.error) {
        throw new Error(parseAuthError(result.error))
      }

      const token = extractToken(result)
      const authUser = extractUser(result)

      if (!token) {
        throw new Error('登录失败：未获取到 token')
      }

      await setStoredToken(token)

      // 先使用临时用户信息快速显示，后台再同步完整数据
      if (authUser) {
        setUser(createTempUserInfo(authUser))
        loadModels()
      }

      syncUserFromServer()
    } finally {
      setIsSubmitting(false)
    }
  }, [setUser, loadModels, syncUserFromServer])

  // 注册（注册成功后自动登录）
  const register = useCallback(async (email: string, password: string, name?: string) => {
    setIsSubmitting(true)
    try {
      // 1. 注册
      const result = await signUpWithEmail(email, password, name)
      if (result.error) {
        throw new Error(parseAuthError(result.error))
      }

      // 2. 注册成功后自动登录
      const loginResult = await signInWithEmail(email, password)
      if (loginResult.error) {
        throw new Error(parseAuthError(loginResult.error))
      }

      const token = extractToken(loginResult)
      const authUser = extractUser(loginResult)

      if (!token) {
        throw new Error('登录失败：未获取到 token')
      }

      await setStoredToken(token)

      // 先使用临时用户信息快速显示，后台再同步完整数据
      if (authUser) {
        setUser(createTempUserInfo(authUser, name))
        loadModels()
      }

      syncUserFromServer()
    } finally {
      setIsSubmitting(false)
    }
  }, [setUser, loadModels, syncUserFromServer])

  // 登出
  const logout = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const token = await getStoredToken()
      if (token) {
        await signOutFromServer(token)
      }
      await clearStoredToken()
      setUser(null)
      setModels([])
    } finally {
      setIsSubmitting(false)
    }
  }, [setUser])

  // 刷新
  const refresh = useCallback(async () => {
    await syncUserFromServer()
  }, [syncUserFromServer])
  const refreshModels = useCallback(() => loadModels(true), [loadModels])

  const value = useMemo<MembershipContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isInitializing,
      isSubmitting,
      models,
      modelsLoading,
      login,
      register,
      logout,
      refresh,
      refreshModels,
    }),
    [user, isInitializing, isSubmitting, models, modelsLoading, login, register, logout, refresh, refreshModels]
  )

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>
}

// ── Hooks ────────────────────────────────────────────────

export function useMembership(): MembershipContextValue {
  const context = useContext(MembershipContext)
  if (!context) {
    throw new Error('useMembership must be used within MembershipProvider')
  }
  return context
}

/** 用户信息 Hook */
export function useMembershipUser() {
  const { user, isAuthenticated, isInitializing } = useMembership()
  return { user, isAuthenticated, isLoading: isInitializing }
}

/** 模型列表 Hook */
export function useMembershipModels() {
  const { models, modelsLoading, refreshModels } = useMembership()
  return { models, modelsLoading, refreshModels }
}

/** 认证操作 Hook */
export function useMembershipAuth() {
  const { login, register, logout, isSubmitting } = useMembership()
  return { login, register, logout, isLoading: isSubmitting }
}
