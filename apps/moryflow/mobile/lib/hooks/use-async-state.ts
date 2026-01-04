import { useState, useCallback, useRef } from 'react'

/**
 * 异步状态接口
 */
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * 异步操作接口
 */
export interface AsyncActions<T> {
  execute: (promise: Promise<T>) => Promise<T>
  setData: (data: T | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: Error | string | null) => void
  reset: () => void
}

export type UseAsyncStateReturn<T> = AsyncState<T> & AsyncActions<T>

/**
 * 管理异步操作状态的 Hook
 *
 * 提供统一的异步操作状态管理，包括数据、加载状态和错误处理。
 * 自动处理竞态条件，确保只有最后一次执行的结果会更新状态。
 */
export function useAsyncState<T>(initialData: T | null = null): UseAsyncStateReturn<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const executionIdRef = useRef(0)

  const execute = useCallback(async (promise: Promise<T>): Promise<T> => {
    const executionId = ++executionIdRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await promise
      if (executionId === executionIdRef.current) {
        setData(result)
      }
      return result
    } catch (err) {
      if (executionId === executionIdRef.current) {
        const normalizedError = err instanceof Error ? err : new Error(String(err))
        setError(normalizedError)
      }
      throw err
    } finally {
      if (executionId === executionIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  const setErrorNormalized = useCallback((error: Error | string | null) => {
    if (error === null) {
      setError(null)
    } else if (error instanceof Error) {
      setError(error)
    } else {
      setError(new Error(error))
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setLoading(false)
    setError(null)
    executionIdRef.current = 0
  }, [])

  return {
    data,
    loading,
    error,
    execute,
    setData,
    setLoading,
    setError: setErrorNormalized,
    reset,
  }
}
