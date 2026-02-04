/**
 * [PROPS]: MessageListProps - 消息列表渲染配置
 * [EMITS]: None
 * [POS]: AI 会话列表的通用布局封装
 * [UPDATE]: 2026-02-04 - 移除顶部 inset，严格对齐 assistant-ui
 * [UPDATE]: 2026-02-03 - 锚点/Slack 内聚到 MessageRoot，对齐 assistant-ui
 * [UPDATE]: 2026-02-03 - 滚动触发迁移到 Viewport AutoScroll 事件
 * [UPDATE]: 2026-02-03 - 移除 thinking 占位，避免 DOM 替换导致锚点跳变
 * [UPDATE]: 2026-02-04 - runStart 触发迁移到 MessageRoot，避免列表层过早触发
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { Fragment, useEffect, useRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import type { ChatStatus, UIMessage } from 'ai';

import { cn } from '../lib/utils';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from './conversation';
import { ConversationViewportFooter, useConversationViewport } from './conversation-viewport';
import { ConversationMessageProvider } from './message/context';

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
  const emitAutoScrollEvent = useConversationViewport((state) => state.emitAutoScrollEvent);

  const conversationKey = threadId ?? messages[0]?.id ?? 'empty';
  const previousKeyRef = useRef(conversationKey);
  const didInitializeRef = useRef(false);

  useEffect(() => {
    if (previousKeyRef.current !== conversationKey) {
      previousKeyRef.current = conversationKey;
      didInitializeRef.current = false;
      emitAutoScrollEvent('threadSwitch');
    }
  }, [conversationKey, emitAutoScrollEvent]);

  useEffect(() => {
    if (!didInitializeRef.current && messages.length > 0) {
      didInitializeRef.current = true;
      emitAutoScrollEvent('initialize');
    }
  }, [emitAutoScrollEvent, messages.length]);

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
          {messages.map((message, index) => (
            <ConversationMessageProvider
              key={message.id}
              message={message}
              index={index}
              messages={messages}
              status={status}
            >
              <Fragment>{renderMessage({ message, index })}</Fragment>
            </ConversationMessageProvider>
          ))}
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
  ...props
}: MessageListProps) => {
  return (
    <div className={cn('flex min-w-0 min-h-0 flex-col overflow-hidden', className)} {...props}>
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
