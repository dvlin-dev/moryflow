import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { parseAuthError } from '@anyhunt/api'
import { signIn, signUp, signOut, setStoredToken, clearStoredToken, getStoredToken } from './client'
import { fetchCurrentUser, fetchMembershipModels } from './api'
import type { UserInfo, MembershipModel, MembershipAuthState } from './types'

/** 会员模型启用状态的存储 key */
const MEMBERSHIP_ENABLED_KEY = 'moryflow_membership_enabled'
/** 用户信息存储 key */
const USER_INFO_KEY = 'moryflow_user_info'

/** 从本地存储读取用户信息 */
const getStoredUserInfo = (): UserInfo | null => {
  try {
    const stored = localStorage.getItem(USER_INFO_KEY)
    if (!stored) return null
    return JSON.parse(stored) as UserInfo
  } catch {
    return null
  }
}

/** 将用户信息存储到本地 */
const setStoredUserInfo = (user: UserInfo | null) => {
  try {
    if (user) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_INFO_KEY)
    }
  } catch {
    // ignore
  }
}

/** 同步 token 到 main 进程 */
const syncTokenToMain = (token: string | null) => {
  if (window.desktopAPI?.membership?.syncToken) {
    window.desktopAPI.membership.syncToken(token).catch((err) => {
      console.error('[AuthProvider] Failed to sync token to main:', err)
    })
  }
}

/** 同步启用状态到 main 进程 */
const syncEnabledToMain = (enabled: boolean) => {
  if (window.desktopAPI?.membership?.syncEnabled) {
    window.desktopAPI.membership.syncEnabled(enabled).catch((err) => {
      console.error('[AuthProvider] Failed to sync enabled to main:', err)
    })
  }
}

interface AuthContextValue extends MembershipAuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  // 会员模型缓存
  models: MembershipModel[]
  modelsLoading: boolean
  refreshModels: () => Promise<void>
  // 会员模型启用状态
  membershipEnabled: boolean
  setMembershipEnabled: (enabled: boolean) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // 初始化时先从本地存储还原用户信息
  const [user, setUserState] = useState<UserInfo | null>(() => getStoredUserInfo())
  const [isLoading, setIsLoading] = useState(true)

  // 设置用户信息并同步到本地存储
  const setUser = useCallback((newUser: UserInfo | null) => {
    setUserState(newUser)
    setStoredUserInfo(newUser)
  }, [])
  const [models, setModels] = useState<MembershipModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [membershipEnabled, setMembershipEnabledState] = useState(() => {
    // 从 localStorage 初始化，默认为 true
    const stored = localStorage.getItem(MEMBERSHIP_ENABLED_KEY)
    return stored !== 'false'
  })

  // 设置会员模型启用状态并持久化
  const setMembershipEnabled = useCallback((enabled: boolean) => {
    setMembershipEnabledState(enabled)
    localStorage.setItem(MEMBERSHIP_ENABLED_KEY, String(enabled))
    syncEnabledToMain(enabled)
  }, [])

  // 加载会员模型（带缓存，只在没有数据时请求）
  const loadModels = useCallback(async (force = false) => {
    // 如果已有数据且不是强制刷新，跳过
    if (models.length > 0 && !force) {
      return
    }

    setModelsLoading(true)
    try {
      const response = await fetchMembershipModels()
      const membershipModels: MembershipModel[] = response.data.map((model) => ({
        id: model.id,
        name: model.display_name || model.id,
        ownedBy: model.owned_by,
        minTier: model.min_tier,
        available: model.available,
      }))
      setModels(membershipModels)
    } catch (err) {
      console.error('[AuthProvider] Failed to load models:', err)
    } finally {
      setModelsLoading(false)
    }
  }, [models.length])

  const loadUser = useCallback(async () => {
    const token = getStoredToken()
    const cachedUser = getStoredUserInfo()
    console.log('[AuthProvider] loadUser called, hasToken:', !!token, 'hasCachedUser:', !!cachedUser)

    if (!token) {
      console.log('[AuthProvider] No token, clearing user state')
      setUser(null)
      setIsLoading(false)
      syncTokenToMain(null)
      return
    }

    // 如果有缓存的用户信息，先使用缓存，立即同步 token 到 main
    if (cachedUser) {
      console.log('[AuthProvider] Using cached user info')
      setUser(cachedUser)
      syncTokenToMain(token)
      loadModels()
      setIsLoading(false)
    }

    // 后台请求 /me 接口同步最新用户信息
    try {
      console.log('[AuthProvider] Fetching current user info...')
      const userInfo = await fetchCurrentUser()
      console.log('[AuthProvider] User info loaded:', userInfo)
      setUser(userInfo)
      syncTokenToMain(token)
      // 如果没有缓存，这里才加载模型
      if (!cachedUser) {
        loadModels()
      }
    } catch (error) {
      console.error('[AuthProvider] Failed to load user info:', error)
      // Token 过期，清除所有状态
      clearStoredToken()
      setUser(null)
      setModels([])
      syncTokenToMain(null)
    } finally {
      setIsLoading(false)
    }
  }, [loadModels, setUser])

  useEffect(() => {
    loadUser()
    // 初始化时同步启用状态到 main 进程
    syncEnabledToMain(membershipEnabled)
  }, [loadUser, membershipEnabled])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      console.log('[AuthProvider] Starting login...')
      const result = await signIn.email({ email, password })
      console.log('[AuthProvider] Login result:', result)

      if (result?.error) {
        console.error('[AuthProvider] Login error:', result.error)
        throw new Error(parseAuthError(result.error))
      }

      if (result?.data?.token) {
        console.log('[AuthProvider] Saving token...')
        setStoredToken(result.data.token)
      }

      if (result?.data?.user) {
        console.log('[AuthProvider] Login successful, loading user info...')
        await loadUser()
      }
    } catch (error) {
      console.error('[AuthProvider] Login failed:', error)
      setIsLoading(false)
      throw error
    }
  }, [loadUser])

  const register = useCallback(async (email: string, password: string, name?: string) => {
    setIsLoading(true)
    try {
      console.log('[AuthProvider] Starting register...')
      const result = await signUp.email({ email, password, name: name || email.split('@')[0] })
      console.log('[AuthProvider] Register result:', result)

      if (result?.error) {
        console.error('[AuthProvider] Register error:', result.error)
        throw new Error(parseAuthError(result.error))
      }

      if (result?.data?.token) {
        console.log('[AuthProvider] Saving token...')
        setStoredToken(result.data.token)
      }

      if (result?.data?.user) {
        console.log('[AuthProvider] Register successful, loading user info...')
        await loadUser()
      }
    } catch (error) {
      console.error('[AuthProvider] Register failed:', error)
      setIsLoading(false)
      throw error
    }
  }, [loadUser])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await signOut()
      clearStoredToken()
      setUser(null)
      setModels([]) // 清除模型缓存
      syncTokenToMain(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    await loadUser()
  }, [loadUser])

  const refreshModels = useCallback(async () => {
    await loadModels(true)
  }, [loadModels])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refresh,
        models,
        modelsLoading,
        refreshModels,
        membershipEnabled,
        setMembershipEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
