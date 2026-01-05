/**
 * MessageAnimationContext
 *
 * 管理消息入场动画状态：
 * - 追踪哪些消息已完成动画
 * - 追踪最后用户消息是否已完成动画（用于助手消息等待）
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from 'react'
import { useSharedValue } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'

interface MessageAnimationContextValue {
  /** 检查消息是否需要动画（第一次显示时需要） */
  shouldAnimate: (messageId: string) => boolean
  /** 标记消息已完成动画 */
  markAnimated: (messageId: string) => void
  /** 批量标记消息为已动画（用于历史消息，跳过动画） */
  markMessagesAsAnimated: (messageIds: string[]) => void
  /** 最后用户消息是否已完成动画（SharedValue，用于 worklet） */
  lastUserMessageAnimated: SharedValue<boolean>
  /** 设置最后用户消息动画完成状态 */
  setLastUserMessageAnimated: (value: boolean) => void
}

const MessageAnimationContext =
  createContext<MessageAnimationContextValue | null>(null)

interface MessageAnimationProviderProps {
  children: ReactNode
}

export function MessageAnimationProvider({
  children,
}: MessageAnimationProviderProps) {
  // 已完成动画的消息 ID 集合
  const animatedIdsRef = useRef<Set<string>>(new Set())

  // 最后用户消息是否已完成动画（用于助手消息等待）
  const lastUserMessageAnimated = useSharedValue(true)

  const shouldAnimate = useCallback((messageId: string): boolean => {
    return !animatedIdsRef.current.has(messageId)
  }, [])

  const markAnimated = useCallback((messageId: string): void => {
    animatedIdsRef.current.add(messageId)
  }, [])

  const markMessagesAsAnimated = useCallback((messageIds: string[]): void => {
    messageIds.forEach((id) => animatedIdsRef.current.add(id))
  }, [])

  const setLastUserMessageAnimated = useCallback(
    (value: boolean): void => {
      lastUserMessageAnimated.value = value
    },
    [lastUserMessageAnimated]
  )

  // 稳定的 context value，避免不必要的重渲染
  const contextValue = useMemo(
    () => ({
      shouldAnimate,
      markAnimated,
      markMessagesAsAnimated,
      lastUserMessageAnimated,
      setLastUserMessageAnimated,
    }),
    [
      shouldAnimate,
      markAnimated,
      markMessagesAsAnimated,
      lastUserMessageAnimated,
      setLastUserMessageAnimated,
    ]
  )

  return (
    <MessageAnimationContext.Provider value={contextValue}>
      {children}
    </MessageAnimationContext.Provider>
  )
}

/**
 * 使用消息动画 Hook
 */
export function useMessageAnimation() {
  const context = useContext(MessageAnimationContext)
  if (!context) {
    throw new Error(
      'useMessageAnimation must be used within MessageAnimationProvider'
    )
  }
  return context
}
