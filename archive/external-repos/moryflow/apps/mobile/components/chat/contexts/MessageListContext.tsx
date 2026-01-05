/**
 * MessageListContext
 *
 * 管理消息列表状态：
 * - isAtEnd: 是否在底部（用于显示滚动按钮和自动滚动）
 *
 * 重构说明：
 * - 移除了 lastUserMessageHeight、placeholderMinHeight（导致复杂滚动逻辑的根源）
 * - 简化为只管理滚动状态
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import { useSharedValue } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'

/** 临时 AI 占位消息的固定 ID */
export const TEMP_AI_MESSAGE_ID = 'temp-ai-placeholder'

interface MessageListContextValue {
  /** 是否在底部（SharedValue 用于 worklet 访问） */
  isAtEnd: SharedValue<boolean>
}

const MessageListContext = createContext<MessageListContextValue | null>(null)

interface MessageListProviderProps {
  children: ReactNode
}

export function MessageListProvider({ children }: MessageListProviderProps) {
  const isAtEnd = useSharedValue(true)

  const value = useMemo(() => ({
    isAtEnd,
  }), [isAtEnd])

  return (
    <MessageListContext.Provider value={value}>
      {children}
    </MessageListContext.Provider>
  )
}

/**
 * 使用消息列表 Hook
 */
export function useMessageList() {
  const context = useContext(MessageListContext)
  if (!context) {
    throw new Error('useMessageList must be used within MessageListProvider')
  }
  return context
}
