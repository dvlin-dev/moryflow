import { useEffect, useRef, useState } from 'react'
import { isToolUIPart, type UIMessage } from 'ai'
import type { PlanSnapshot } from '@shared/ipc'

/**
 * 从消息中提取当前会话的 Plan 快照
 * 直接从 manage_plan 工具输出获取数据，确保实时同步
 */
export const useTodoSnapshot = ({
  messages,
  activeSessionId,
}: {
  messages: UIMessage[]
  activeSessionId?: string | null
}) => {
  const [snapshot, setSnapshot] = useState<PlanSnapshot | null>(null)
  const lastToolCallId = useRef<string | null>(null)

  useEffect(() => {
    // 倒序查找最新的 manage_plan 输出
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      if (!message?.parts) continue

      const parts = message.parts.filter(isToolUIPart)
      for (let j = parts.length - 1; j >= 0; j--) {
        const part = parts[j]
        if (
          part?.type === 'tool-manage_plan' &&
          part.state === 'output-available' &&
          part.toolCallId
        ) {
          // 已处理过的跳过
          if (part.toolCallId === lastToolCallId.current) return

          lastToolCallId.current = part.toolCallId
          const output = part.output as PlanSnapshot | null

          // 有未完成任务时显示，否则隐藏
          if (output?.tasks?.some((t) => t.status !== 'completed')) {
            setSnapshot(output)
          } else {
            setSnapshot(null)
          }
          return
        }
      }
    }
  }, [messages])

  // 会话切换时重置
  useEffect(() => {
    lastToolCallId.current = null
    setSnapshot(null)
  }, [activeSessionId])

  return { todoSnapshot: snapshot }
}
