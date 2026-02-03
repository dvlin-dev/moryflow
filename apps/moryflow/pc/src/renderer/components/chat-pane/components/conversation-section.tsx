/**
 * [PROPS]: Props - 对话列表渲染参数
 * [EMITS]: None
 * [POS]: Chat Pane 消息列表与错误提示渲染
 * [UPDATE]: 2026-02-03 - 让 MessageList 充满容器，确保 Footer 贴底
 * [UPDATE]: 2026-02-03 - 移除顶部 inset 传递，避免二次扣减导致下沉
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@anyhunt/ui/components/alert';
import { MessageList } from '@anyhunt/ui/ai/message-list';
import { useTranslation } from '@/lib/i18n';
import { ChatMessage } from './message';
import type { ChatStatus, UIMessage } from 'ai';
import type { MessageActionHandlers } from './message/const';

type Props = {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error | null;
  messageActions?: MessageActionHandlers;
  onToolApproval?: (input: { approvalId: string; remember: 'once' | 'always' }) => void;
  footer?: ReactNode;
  threadId?: string | null;
};

/**
 * 对话内容区域渲染，包含空态、消息列表和错误提示。
 */
export const ConversationSection = ({
  messages,
  status,
  error,
  messageActions,
  onToolApproval,
  footer,
  threadId,
}: Props) => {
  const { t } = useTranslation('chat');

  const lastAssistantIndex = useMemo(() => {
    let lastIndex = -1;
    messages.forEach((message, index) => {
      if (message.role === 'assistant') {
        lastIndex = index;
      }
    });
    return lastIndex;
  }, [messages]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MessageList
        className="min-h-0 flex-1"
        messages={messages}
        status={status}
        threadId={threadId ?? undefined}
        emptyState={{
          title: t('waitingForYou'),
          description: t('startChatPrompt'),
        }}
        footer={footer}
        renderMessage={({ message, index }) => {
          const isLastAssistant = index === lastAssistantIndex;

          return (
            <ChatMessage
              message={message}
              messageIndex={index}
              status={status}
              isLastAssistant={isLastAssistant}
              actions={messageActions}
              onToolApproval={onToolApproval}
            />
          );
        }}
      />
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
