/**
 * [PROPS]: MessageListProps - 消息列表渲染配置
 * [EMITS]: None
 * [POS]: AI 会话列表的通用布局封装
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { Fragment, type HTMLAttributes, type ReactNode } from 'react';
import type { ChatStatus, UIMessage } from 'ai';

import { cn } from '../lib/utils';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from './conversation';
import { useConversationLayout } from './use-conversation-layout';

export type MessageListEmptyState = {
  title?: string;
  description?: string;
  icon?: ReactNode;
};

export type MessageListRenderArgs = {
  message: UIMessage;
  index: number;
  isPlaceholder: boolean;
  minHeight?: string;
  registerRef: (node: HTMLElement | null) => void;
};

export type MessageListProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  messages: UIMessage[];
  status: ChatStatus;
  renderMessage: (args: MessageListRenderArgs) => ReactNode;
  emptyState?: MessageListEmptyState;
  contentClassName?: string;
  conversationClassName?: string;
  showScrollButton?: boolean;
};

export const MessageList = ({
  messages,
  status,
  renderMessage,
  emptyState,
  className,
  contentClassName,
  conversationClassName,
  showScrollButton = true,
  ...props
}: MessageListProps) => {
  const { conversationContextRef, registerMessageRef, renderMessages, getMessageLayout } =
    useConversationLayout(messages, status);

  return (
    <div className={cn('flex min-w-0 flex-col overflow-hidden', className)} {...props}>
      <Conversation contextRef={conversationContextRef} className={conversationClassName}>
        {messages.length === 0 ? (
          <ConversationEmptyState
            title={emptyState?.title}
            description={emptyState?.description}
            icon={emptyState?.icon}
          />
        ) : (
          <ConversationContent className={cn('min-w-0', contentClassName)}>
            {renderMessages.map((message, index) => {
              const { isPlaceholder, minHeight } = getMessageLayout(message);

              return (
                <Fragment key={message.id}>
                  {renderMessage({
                    message,
                    index,
                    isPlaceholder,
                    minHeight,
                    registerRef: (node) => registerMessageRef(message.id, node),
                  })}
                </Fragment>
              );
            })}
          </ConversationContent>
        )}
        {showScrollButton ? <ConversationScrollButton /> : null}
      </Conversation>
    </div>
  );
};
