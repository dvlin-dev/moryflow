import { useEffect } from 'react'
import type { UIMessage } from 'ai'

type SetMessagesFn = (messages: UIMessage[]) => void

/**
 * 会话切换时补齐历史消息，失败时回退为空数组避免界面卡死。
 */
export const useStoredMessages = ({
  activeSessionId,
  setMessages,
}: {
  activeSessionId?: string | null
  setMessages: SetMessagesFn
}) => {
  useEffect(() => {
    if (!activeSessionId || !window.desktopAPI?.chat?.getSessionMessages) {
      return
    }
    let cancelled = false
    const loadMessages = async () => {
      try {
        const stored = await window.desktopAPI.chat.getSessionMessages({
          sessionId: activeSessionId,
        })
        if (!cancelled) {
          setMessages(stored ?? [])
        }
      } catch (error) {
        console.error('[chat-pane] failed to load session messages', error)
        if (!cancelled) {
          setMessages([])
        }
      }
    }
    void loadMessages()
    return () => {
      cancelled = true
    }
  }, [activeSessionId, setMessages])
}
