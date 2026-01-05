import React, { createContext, useContext, useCallback, useState, useRef } from 'react'
import { router } from 'expo-router'
import { useMembershipUser } from '@/lib/server'

/**
 * 需要鉴权的操作类型
 * 便于追踪和分析用户行为
 */
export type ProtectedAction =
  | 'send_message'
  | 'create_note'
  | 'edit_note'
  | 'delete_note'
  | 'sync_data'
  | 'upload_file'
  | 'access_settings'
  | 'export_data'
  | string // 允许扩展

/**
 * 鉴权守卫上下文值
 */
export interface AuthGuardContextValue {
  /**
   * 执行需要鉴权的操作
   * 如果用户未登录，会跳转到登录页，登录成功后自动执行回调
   * @param action 操作类型（用于追踪）
   * @param callback 需要执行的操作
   * @returns Promise，登录成功并执行回调后 resolve
   */
  requireAuth: <T>(action: ProtectedAction, callback: () => T | Promise<T>) => Promise<T>

  /**
   * 检查是否已登录，不触发登录流程
   */
  checkAuth: () => boolean

  /**
   * 当前是否有待执行的操作
   */
  hasPendingAction: boolean

  /**
   * 取消待执行的操作
   */
  cancelPendingAction: () => void
}

const AuthGuardContext = createContext<AuthGuardContextValue | undefined>(undefined)

interface PendingAction {
  action: ProtectedAction
  callback: () => unknown
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

export interface AuthGuardProviderProps {
  children: React.ReactNode
}

/**
 * 鉴权守卫提供者
 * 实现延迟鉴权模式：用户可以浏览内容，但执行关键操作时需要登录
 */
export function AuthGuardProvider({ children }: AuthGuardProviderProps) {
  const { isAuthenticated: isSignedIn } = useMembershipUser()
  const [hasPendingAction, setHasPendingAction] = useState(false)
  const pendingActionRef = useRef<PendingAction | null>(null)

  /**
   * 检查是否已登录
   */
  const checkAuth = useCallback(() => {
    return isSignedIn
  }, [isSignedIn])

  /**
   * 取消待执行的操作
   */
  const cancelPendingAction = useCallback(() => {
    if (pendingActionRef.current) {
      pendingActionRef.current.reject(new Error('用户取消了操作'))
      pendingActionRef.current = null
      setHasPendingAction(false)
    }
  }, [])

  /**
   * 执行需要鉴权的操作
   */
  const requireAuth = useCallback(
    <T,>(action: ProtectedAction, callback: () => T | Promise<T>): Promise<T> => {
      // 已登录，直接执行
      if (isSignedIn) {
        return Promise.resolve(callback())
      }

      // 未登录，保存操作并跳转登录
      return new Promise<T>((resolve, reject) => {
        pendingActionRef.current = {
          action,
          callback,
          resolve: resolve as (value: unknown) => void,
          reject,
        }
        setHasPendingAction(true)

        // 跳转到登录页，带上 returnTo 参数
        router.push({
          pathname: '/(auth)/sign-in',
          params: { returnAction: action },
        })
      })
    },
    [isSignedIn]
  )

  /**
   * 监听登录状态变化，执行待处理的操作
   */
  React.useEffect(() => {
    if (isSignedIn && pendingActionRef.current) {
      const pending = pendingActionRef.current
      pendingActionRef.current = null
      setHasPendingAction(false)

      // 执行待处理的操作
      try {
        const result = pending.callback()
        if (result instanceof Promise) {
          result.then(pending.resolve).catch(pending.reject)
        } else {
          pending.resolve(result)
        }
      } catch (error) {
        pending.reject(error)
      }
    }
  }, [isSignedIn])

  const contextValue = React.useMemo<AuthGuardContextValue>(
    () => ({
      requireAuth,
      checkAuth,
      hasPendingAction,
      cancelPendingAction,
    }),
    [requireAuth, checkAuth, hasPendingAction, cancelPendingAction]
  )

  return <AuthGuardContext.Provider value={contextValue}>{children}</AuthGuardContext.Provider>
}

/**
 * 使用鉴权守卫的 Hook
 */
export function useAuthGuard() {
  const context = useContext(AuthGuardContext)

  if (!context) {
    throw new Error('useAuthGuard must be used within an AuthGuardProvider')
  }

  return context
}


