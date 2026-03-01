/**
 * [PROPS]: Props - 对话列表渲染参数
 * [EMITS]: None
 * [POS]: Chat Pane 消息列表与错误提示渲染
 * [UPDATE]: 2026-03-01 - 最后一条 assistant 改为按“可见消息”计算，避免隐藏占位后丢失 retry 入口
 * [UPDATE]: 2026-02-03 - 让 MessageList 充满容器，确保 Footer 贴底
 * [UPDATE]: 2026-02-04 - 移除顶部 inset，严格对齐 assistant-ui
 * [UPDATE]: 2026-02-04 - 移除 scrollReady 透传，滚动时机交由 UI 包处理
 * [UPDATE]: 2026-02-10 - 透传 isLastMessage 给 ChatMessage，用于精确启用 Streamdown 流式动画
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@moryflow/ui/components/alert';
import { MessageList } from '@moryflow/ui/ai/message-list';
import { useTranslation } from '@/lib/i18n';
import { ChatMessage } from './message';
import type { ChatStatus, UIMessage } from 'ai';
import type { MessageActionHandlers } from './message/const';
import { resolveLastVisibleAssistantIndex } from './message/message-loading';

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

  const lastAssistantIndex = useMemo(
    () => resolveLastVisibleAssistantIndex({ messages, status }),
    [messages, status]
  );

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
          const isLastMessage = index === messages.length - 1;

          return (
            <ChatMessage
              message={message}
              messageIndex={index}
              status={status}
              isLastAssistant={isLastAssistant}
              isLastMessage={isLastMessage}
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
