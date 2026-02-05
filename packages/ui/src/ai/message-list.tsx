/**
 * [PROPS]: MessageListProps - 消息列表渲染配置
 * [EMITS]: None
 * [POS]: AI 会话列表的通用布局封装
 * [UPDATE]: 2026-02-04 - 移除顶部 inset，严格对齐 assistant-ui
 * [UPDATE]: 2026-02-05 - 移除自研事件驱动，改为 assistant-ui Resize/Mutation 自动滚动
 * [UPDATE]: 2026-02-05 - threadId 仅用于重建 Conversation，确保视口状态重置
 * [UPDATE]: 2026-02-05 - 对齐 assistant-ui 最新版事件触发（initialize/runStart/threadSwitch）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import type { ChatStatus, UIMessage } from 'ai';

import { cn } from '../lib/utils';
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from './conversation';
import { ConversationViewportFooter } from './conversation-viewport';
import { emitAuiEvent } from './assistant-ui/utils/hooks/useAuiEvent';
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
>;

const MessageListInner = ({
  messages,
  status,
  renderMessage,
  emptyState,
  contentClassName,
  showScrollButton = true,
  footer,
}: MessageListInnerProps) => {
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
              {renderMessage({ message, index })}
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
  const conversationKey = threadId ?? messages[0]?.id ?? 'empty';
  const prevLengthRef = useRef<number>(messages.length);
  const prevThreadIdRef = useRef<string | null | undefined>(threadId);
  const lastMessageRef = useRef<{ id: string; role: UIMessage['role'] } | null>(null);

  useEffect(() => {
    const previousLength = prevLengthRef.current;
    if (previousLength === 0 && messages.length > 0) {
      emitAuiEvent('thread.initialize');
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (prevThreadIdRef.current && threadId && prevThreadIdRef.current !== threadId) {
      emitAuiEvent('threadListItem.switchedTo');
    }
    prevThreadIdRef.current = threadId;
  }, [threadId]);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    const prevLast = lastMessageRef.current;
    const previousRole = messages.length >= 2 ? messages[messages.length - 2]?.role : null;

    const isNewAssistantMessage =
      lastMessage.role === 'assistant' &&
      (!prevLast || prevLast.id !== lastMessage.id || prevLast.role !== lastMessage.role);

    if (isNewAssistantMessage && previousRole === 'user') {
      emitAuiEvent('thread.runStart');
    }

    lastMessageRef.current = { id: lastMessage.id, role: lastMessage.role };
  }, [messages]);

  return (
    <div className={cn('flex min-w-0 min-h-0 flex-col overflow-hidden', className)} {...props}>
      <Conversation key={conversationKey} className={conversationClassName}>
        <MessageListInner
          messages={messages}
          status={status}
          renderMessage={renderMessage}
          emptyState={emptyState}
          contentClassName={contentClassName}
          showScrollButton={showScrollButton}
          footer={footer}
        />
      </Conversation>
    </div>
  );
};
