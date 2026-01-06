import type { ReactNode } from 'react'
import type { ChatStatus, FileUIPart, ReasoningUIPart, ToolUIPart, UIMessage } from 'ai'

export type MessageActionHandlers = {
  onResend?: (messageIndex: number) => void
  onRetry?: () => void
  onEditAndResend?: (messageIndex: number, newContent: string) => void
  onFork?: (messageIndex: number) => void
}

export type ChatMessageProps = {
  message: UIMessage
  messageIndex: number
  status: ChatStatus
  registerRef?: (id: string, node: HTMLElement | null) => void
  minHeight?: string
  isPlaceholder?: boolean
  /** 是否是最后一条 assistant 消息（用于显示重试按钮） */
  isLastAssistant?: boolean
  /** 消息操作回调 */
  actions?: MessageActionHandlers
}

export type ParsedMessageParts = {
  attachments: FileUIPart[]
  body: string | ReactNode
  reasoningParts: ReasoningUIPart[]
  toolParts: ToolUIPart[]
}
