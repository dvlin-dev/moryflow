/**
 * [PROPS]: MessageListProps - 消息列表渲染配置
 * [EMITS]: None
 * [POS]: AI 会话列表的通用布局封装
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { Fragment, useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import type { ChatStatus, UIMessage } from 'ai';

import { cn } from '../lib/utils';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from './conversation';
import {
  ConversationViewportFooter,
  ConversationViewportSlack,
  useConversationViewport,
} from './conversation-viewport';
import { useSizeHandle } from './conversation-viewport/use-size-handle';

export type MessageListEmptyState = {
  title?: string;
  description?: string;
  icon?: ReactNode;
};

export type MessageListRenderArgs = {
  message: UIMessage;
  index: number;
};

export type MessageListProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  messages: UIMessage[];
  status: ChatStatus;
  renderMessage: (args: MessageListRenderArgs) => ReactNode;
  emptyState?: MessageListEmptyState;
  contentClassName?: string;
  conversationClassName?: string;
  showScrollButton?: boolean;
  footer?: ReactNode;
  threadId?: string | null;
};

type MessageListInnerProps = Pick<
  MessageListProps,
  | 'messages'
  | 'status'
  | 'renderMessage'
  | 'emptyState'
  | 'contentClassName'
  | 'showScrollButton'
  | 'footer'
  | 'threadId'
>;

const AnchorUserMessage = ({ children }: { children: ReactNode }) => {
  const register = useConversationViewport((state) => state.registerUserMessageHeight);
  const anchorRef = useSizeHandle(register);
  return <div ref={anchorRef}>{children}</div>;
};

const MessageListInner = ({
  messages,
  status,
  renderMessage,
  emptyState,
  contentClassName,
  showScrollButton = true,
  footer,
  threadId,
}: MessageListInnerProps) => {
  const scrollToBottom = useConversationViewport((state) => state.scrollToBottom);
  const isAtBottom = useConversationViewport((state) => state.isAtBottom);

  const conversationKey = threadId ?? messages[0]?.id ?? 'empty';
  const previousStatusRef = useRef<ChatStatus | null>(null);
  const lastMessageIndex = messages.length - 1;
  const shouldApplySlack =
    lastMessageIndex >= 1 &&
    messages[lastMessageIndex]?.role === 'assistant' &&
    messages[lastMessageIndex - 1]?.role === 'user';
  const anchorUserIndex = shouldApplySlack ? lastMessageIndex - 1 : -1;

  useEffect(() => {
    scrollToBottom({ behavior: 'instant' });
  }, [conversationKey, scrollToBottom]);

  useEffect(() => {
    const prevStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status === 'submitted' && prevStatus !== 'submitted') {
      scrollToBottom({ behavior: 'auto' });
    }
  }, [scrollToBottom, status]);

  useEffect(() => {
    if (!isAtBottom) return;
    scrollToBottom({ behavior: 'auto' });
  }, [isAtBottom, messages, scrollToBottom]);

  return (
    <>
      {messages.length === 0 ? (
        <ConversationEmptyState
          title={emptyState?.title}
          description={emptyState?.description}
          icon={emptyState?.icon}
        />
      ) : (
        <ConversationContent className={cn('min-w-0', contentClassName)}>
          {messages.map((message, index) => {
            let node = renderMessage({ message, index });

            if (index === anchorUserIndex) {
              node = <AnchorUserMessage>{node}</AnchorUserMessage>;
            }

            if (index === lastMessageIndex && shouldApplySlack) {
              node = <ConversationViewportSlack enabled>{node}</ConversationViewportSlack>;
            }

            return <Fragment key={message.id}>{node}</Fragment>;
          })}
        </ConversationContent>
      )}

      {footer ? (
        <ConversationViewportFooter className="sticky bottom-0">
          {footer}
        </ConversationViewportFooter>
      ) : null}
      {showScrollButton ? <ConversationScrollButton /> : null}
    </>
  );
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
  footer,
  threadId,
  ...props
}: MessageListProps) => {
  return (
    <div className={cn('flex min-w-0 flex-col overflow-hidden', className)} {...props}>
      <Conversation className={conversationClassName}>
        <MessageListInner
          messages={messages}
          status={status}
          renderMessage={renderMessage}
          emptyState={emptyState}
          contentClassName={contentClassName}
          showScrollButton={showScrollButton}
          footer={footer}
          threadId={threadId}
        />
      </Conversation>
    </div>
  );
};
