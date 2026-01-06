/**
 * ChatProvider
 *
 * 组合所有 Chat 相关的 Context Providers
 * 为 ChatScreen 提供统一的上下文环境
 */

import React, { ReactNode } from 'react'
import { ChatLayoutProvider } from './ChatLayoutContext'
import { MessageListProvider } from './MessageListContext'
import { MessageAnimationProvider } from './MessageAnimationContext'

interface ChatProviderProps {
  children: ReactNode
  /** 是否在 Sheet 模式中（影响安全区域计算） */
  isInSheet?: boolean
}

/**
 * Chat Provider 组合
 *
 * 使用方式：
 * ```tsx
 * <ChatProvider isInSheet={false}>
 *   <ChatScreen />
 * </ChatProvider>
 * ```
 */
export function ChatProvider({ children, isInSheet = false }: ChatProviderProps) {
  return (
    <ChatLayoutProvider isInSheet={isInSheet}>
      <MessageListProvider>
        <MessageAnimationProvider>{children}</MessageAnimationProvider>
      </MessageListProvider>
    </ChatLayoutProvider>
  )
}

// 导出所有 Context hooks，方便统一导入
export { useChatLayout } from './ChatLayoutContext'
export { useMessageList } from './MessageListContext'
export { useMessageAnimation } from './MessageAnimationContext'
