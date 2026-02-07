/**
 * [PROPS]: MessageListProps - 消息列表渲染配置
 * [EMITS]: None
 * [POS]: AI 会话列表的通用布局封装
 * [UPDATE]: 2026-02-04 - 移除顶部 inset，严格对齐 assistant-ui
 * [UPDATE]: 2026-02-05 - 移除自研事件驱动，改为 assistant-ui Resize/Mutation 自动滚动
 * [UPDATE]: 2026-02-05 - threadId 仅用于重建 Conversation，确保视口状态重置
 * [UPDATE]: 2026-02-05 - 对齐 assistant-ui 最新版事件触发（initialize/runStart/threadSwitch）
 * [UPDATE]: 2026-02-05 - 移除 TurnAnchor 事件日志，避免噪音
 * [UPDATE]: 2026-02-06 - TurnTail：固定 slack 宿主 + 内置 tail sentinel，避免 scrollTop clamp 跌落
 * [UPDATE]: 2026-02-07 - runStart：进入 running（submitted/streaming）触发，滚动细节由 auto-scroll 内部处理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import type { ChatStatus, UIMessage } from 'ai';

import { cn } from '../lib/utils';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from './conversation';
import { ConversationViewportFooter, ConversationViewportTurnTail } from './conversation-viewport';
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

const findLastUserIndex = (messages: UIMessage[]): number => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return i;
  }
  return -1;
};

const MessageListInner = ({
  messages,
  status,
  renderMessage,
  emptyState,
  contentClassName,
  showScrollButton = true,
  footer,
}: MessageListInnerProps) => {
  const lastIndex = messages.length - 1;
  const lastMessage = lastIndex >= 0 ? messages[lastIndex] : null;
  const lastUserIndex = lastMessage ? findLastUserIndex(messages) : -1;

  const shouldRenderAssistantTail =
    !!lastMessage &&
    lastMessage.role === 'assistant' &&
    lastUserIndex >= 0 &&
    lastUserIndex < lastIndex;

  const shouldApplyTurnAnchorSlack =
    messages.length > 0 && (lastMessage?.role === 'user' || shouldRenderAssistantTail);

  const assistantTailMessage = shouldRenderAssistantTail ? lastMessage : null;

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
            if (assistantTailMessage && index === lastIndex) return null;

            return (
              <ConversationMessageProvider
                key={message.id}
                message={message}
                index={index}
                messages={messages}
                status={status}
              >
                {renderMessage({ message, index })}
              </ConversationMessageProvider>
            );
          })}

          <ConversationViewportTurnTail enabled={shouldApplyTurnAnchorSlack}>
            {assistantTailMessage ? (
              <ConversationMessageProvider
                key={assistantTailMessage.id}
                message={assistantTailMessage}
                index={lastIndex}
                messages={messages}
                status={status}
              >
                {renderMessage({ message: assistantTailMessage, index: lastIndex })}
              </ConversationMessageProvider>
            ) : null}
          </ConversationViewportTurnTail>
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

const isRunningStatus = (status: ChatStatus) => status === 'submitted' || status === 'streaming';

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
  const prevStatusRef = useRef<ChatStatus>(status);

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

    if (prevThreadIdRef.current !== threadId) {
      // 切换 thread 时重置 status 基线，避免误触发 runStart。
      prevStatusRef.current = status;
    }

    prevThreadIdRef.current = threadId;
  }, [threadId, status]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const shouldEmitRunStart = isRunningStatus(status) && !isRunningStatus(prev);

    if (shouldEmitRunStart) {
      emitAuiEvent('thread.runStart');
    }

    prevStatusRef.current = status;
  }, [status]);

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
