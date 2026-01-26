/**
 * [PROPS]: Props - 对话列表渲染参数
 * [EMITS]: None
 * [POS]: Chat Pane 消息列表与错误提示渲染
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo } from 'react';
import { Alert, AlertDescription } from '@anyhunt/ui/components/alert';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@anyhunt/ui/ai/conversation';
import { useTranslation } from '@/lib/i18n';
import { ChatMessage } from './message';
import type { ChatStatus, UIMessage } from 'ai';
import type { UseConversationLayoutResult } from '../hooks';
import type { MessageActionHandlers } from './message/const';

type ConversationLayoutContext = Pick<
  UseConversationLayoutResult,
  'conversationContextRef' | 'renderMessages' | 'getMessageLayout' | 'registerMessageRef'
>;

type Props = ConversationLayoutContext & {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error | null;
  messageActions?: MessageActionHandlers;
  onToolApproval?: (input: { approvalId: string; remember: 'once' | 'always' }) => void;
};

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
  onToolApproval,
}: Props) => {
  const { t } = useTranslation('chat');

  const { messageIndexMap, lastAssistantIndex } = useMemo(() => {
    const map = new Map<string, number>();
    let lastIndex = -1;
    messages.forEach((message, index) => {
      map.set(message.id, index);
      if (message.role === 'assistant') {
        lastIndex = index;
      }
    });
    return { messageIndexMap: map, lastAssistantIndex: lastIndex };
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto">
      <Conversation contextRef={conversationContextRef}>
        {messages.length === 0 ? (
          <ConversationEmptyState title={t('waitingForYou')} description={t('startChatPrompt')} />
        ) : (
          <ConversationContent>
            {renderMessages.map((message) => {
              const { isPlaceholder, minHeight } = getMessageLayout(message);
              // 找到原始 messages 数组中的索引
              const messageIndex = messageIndexMap.get(message.id) ?? -1;
              const isLastAssistant = messageIndex === lastAssistantIndex;

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
                  onToolApproval={onToolApproval}
                />
              );
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
  );
};
