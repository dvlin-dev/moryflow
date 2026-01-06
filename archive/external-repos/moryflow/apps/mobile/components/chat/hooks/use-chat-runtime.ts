/**
 * Chat Runtime Hook
 *
 * 管理 Agent Runtime 初始化状态
 */

import { useState, useEffect } from 'react'
import { isRuntimeInitialized, initAgentRuntime } from '@/lib/agent-runtime'

interface UseChatRuntimeResult {
  /** Runtime 是否已初始化 */
  isInitialized: boolean
  /** 初始化错误 */
  error: Error | null
}

/**
 * 管理 Agent Runtime 初始化
 */
export function useChatRuntime(): UseChatRuntimeResult {
  const [isInitialized, setIsInitialized] = useState(isRuntimeInitialized())
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (isInitialized) return

    initAgentRuntime()
      .then(() => setIsInitialized(true))
      .catch((err: Error) => {
        console.error('[useChatRuntime] Runtime init failed:', err)
        setError(err)
      })
  }, [isInitialized])

  return { isInitialized, error }
}
