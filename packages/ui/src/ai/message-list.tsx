/**
 * [PROPS]: MessageListProps - 消息列表渲染配置
 * [EMITS]: None
 * [POS]: AI 会话列表的通用布局封装
 * [UPDATE]: 2026-02-03 - 补齐历史滚动、run start 采用 scroll-smooth 曲线与 streaming 占位消息
 * [UPDATE]: 2026-02-03 - 支持顶部 inset，对齐外部 header
 * [UPDATE]: 2026-02-03 - Slack/锚点回到列表层，避免 Message 依赖 Viewport
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { Fragment, useEffect, useMemo, useRef, type HTMLAttributes, type ReactNode } from 'react';
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
  topInset?: number;
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

  const conversationKey = threadId ?? messages[0]?.id ?? 'empty';
  const previousStatusRef = useRef<ChatStatus | null>(null);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const previousKeyRef = useRef(conversationKey);
  const didInitialScrollRef = useRef(false);

  const shouldShowThinking =
    (status === 'submitted' || status === 'streaming') &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === 'user';

  const renderMessages = useMemo(() => {
    if (!shouldShowThinking) {
      return messages;
    }
    const anchorId = messages[messages.length - 1]?.id ?? 'thinking';
    const thinkingMessage: UIMessage = {
      id: `${anchorId}-thinking`,
      role: 'assistant',
      parts: [],
    };
    return [...messages, thinkingMessage];
  }, [messages, shouldShowThinking]);

  const lastMessageIndex = renderMessages.length - 1;
  const shouldApplySlack =
    lastMessageIndex >= 1 &&
    renderMessages[lastMessageIndex]?.role === 'assistant' &&
    renderMessages[lastMessageIndex - 1]?.role === 'user';
  const anchorUserIndex = shouldApplySlack ? lastMessageIndex - 1 : -1;

  useEffect(() => {
    if (previousKeyRef.current !== conversationKey) {
      previousKeyRef.current = conversationKey;
      didInitialScrollRef.current = false;
      previousStatusRef.current = null;
      previousLastMessageIdRef.current = null;
    }
  }, [conversationKey]);

  useEffect(() => {
    if (didInitialScrollRef.current || messages.length === 0) {
      return;
    }
    didInitialScrollRef.current = true;
    requestAnimationFrame(() => {
      scrollToBottom({ behavior: 'instant' });
    });
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const prevStatus = previousStatusRef.current;
    const prevLastMessageId = previousLastMessageIdRef.current;

    const wasRunning = prevStatus === 'submitted' || prevStatus === 'streaming';
    const isRunning = status === 'submitted' || status === 'streaming';
    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage?.id ?? null;
    const lastMessageRole = lastMessage?.role;
    const hasNewUserMessage =
      isRunning && lastMessageRole === 'user' && lastMessageId !== prevLastMessageId;

    if (hasNewUserMessage || (!wasRunning && isRunning)) {
      requestAnimationFrame(() => {
        scrollToBottom({ behavior: 'auto' });
      });
    }

    previousStatusRef.current = status;
    previousLastMessageIdRef.current = lastMessageId;
  }, [messages, scrollToBottom, status]);

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
          {renderMessages.map((message, index) => {
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

      {footer || showScrollButton ? (
        <ConversationViewportFooter className="sticky bottom-0">
          {showScrollButton ? <ConversationScrollButton /> : null}
          {footer}
        </ConversationViewportFooter>
      ) : null}
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
  topInset,
  ...props
}: MessageListProps) => {
  return (
    <div className={cn('flex min-w-0 min-h-0 flex-col overflow-hidden', className)} {...props}>
      <Conversation className={conversationClassName} topInset={topInset}>
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
