/**
 * 会话切换时加载历史消息
 *
 * 与 PC 端 chat-pane/hooks/use-stored-messages.ts 对应
 */

import { useEffect, useState } from 'react'
import { InteractionManager } from 'react-native'
import type { UIMessage } from 'ai'
import { getUiMessages } from '@/lib/agent-runtime'

type SetMessagesFn = (messages: UIMessage[]) => void

/**
 * 会话切换时补齐历史消息，失败时回退为空数组避免界面卡死。
 */
export function useStoredMessages({
  activeSessionId,
  setMessages,
  onHistoryLoaded,
  delayMs = 0,
}: {
  activeSessionId?: string | null
  setMessages: SetMessagesFn
  /** 历史消息加载完成后的回调，用于标记历史消息跳过动画 */
  onHistoryLoaded?: (messageIds: string[]) => void
  /** 延迟加载时间（毫秒），用于等待动画完成 */
  delayMs?: number
}) {
  const [isLoadingHistory, setIsLoadingHistory] = useState(delayMs > 0)

  useEffect(() => {
    if (!activeSessionId) {
      setIsLoadingHistory(false)
      return
    }
    let cancelled = false

    // 延迟加载时先显示 loading 状态
    if (delayMs > 0) {
      setIsLoadingHistory(true)
    }

    const loadMessages = async () => {
      try {
        const stored = await getUiMessages(activeSessionId)
        if (!cancelled) {
          const messages = stored ?? []
          // 先标记历史消息跳过动画，再设置消息（避免渲染时触发动画）
          if (onHistoryLoaded && messages.length > 0) {
            onHistoryLoaded(messages.map((m) => m.id))
          }
          setMessages(messages)
          setIsLoadingHistory(false)
        }
      } catch (error) {
        console.error('[useStoredMessages] failed to load session messages', error)
        if (!cancelled) {
          setMessages([])
          setIsLoadingHistory(false)
        }
      }
    }

    // 延迟加载：等待动画完成后再加载消息，避免阻塞 UI
    if (delayMs > 0) {
      const timeout = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          if (!cancelled) {
            void loadMessages()
          }
        })
      }, delayMs)
      return () => {
        cancelled = true
        clearTimeout(timeout)
      }
    } else {
      void loadMessages()
      return () => {
        cancelled = true
      }
    }
  }, [activeSessionId, setMessages, onHistoryLoaded, delayMs])

  return { isLoadingHistory }
}
