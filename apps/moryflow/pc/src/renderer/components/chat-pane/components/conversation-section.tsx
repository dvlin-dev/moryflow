import { useMemo } from 'react'
import { Alert, AlertDescription } from '@anyhunt/ui/components/alert'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@anyhunt/ui/ai/conversation'
import { useTranslation } from '@/lib/i18n'
import { ChatMessage } from './message'
import type { ChatStatus, UIMessage } from 'ai'
import type { UseConversationLayoutResult } from '../hooks'
import type { MessageActionHandlers } from './message/const'

type ConversationLayoutContext = Pick<
  UseConversationLayoutResult,
  'conversationContextRef' | 'renderMessages' | 'getMessageLayout' | 'registerMessageRef'
>

type Props = ConversationLayoutContext & {
  messages: UIMessage[]
  status: ChatStatus
  error?: Error | null
  messageActions?: MessageActionHandlers
}

/**
 * 对话内容区域渲染，包含空态、消息列表和错误提示。
 */
export const ConversationSection = ({
  messages,
  status,
  error,
  conversationContextRef,
  renderMessages,
  getMessageLayout,
  registerMessageRef,
  messageActions,
}: Props) => {
  const { t } = useTranslation('chat')

  // 找到最后一条 assistant 消息的索引
  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        return i
      }
    }
    return -1
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto">
      <Conversation contextRef={conversationContextRef}>
        {messages.length === 0 ? (
          <ConversationEmptyState
            title={t('waitingForYou')}
            description={t('startChatPrompt')}
          />
        ) : (
          <ConversationContent>
            {renderMessages.map((message, renderIndex) => {
              const { isPlaceholder, minHeight } = getMessageLayout(message)
              // 找到原始 messages 数组中的索引
              const messageIndex = messages.findIndex((m) => m.id === message.id)
              const isLastAssistant = messageIndex === lastAssistantIndex

              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  messageIndex={messageIndex}
                  status={status}
                  registerRef={registerMessageRef}
                  minHeight={minHeight}
                  isPlaceholder={isPlaceholder}
                  isLastAssistant={isLastAssistant}
                  actions={messageActions}
                />
              )
            })}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>
      {error && (
        <div className="px-4 pb-4">
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
