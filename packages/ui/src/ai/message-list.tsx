/**
 * [PROPS]: MessageListProps - 消息列表渲染配置
 * [EMITS]: None
 * [POS]: AI 会话列表的通用布局封装
 * [UPDATE]: 2026-02-04 - 移除顶部 inset，减少布局抖动来源
 * [UPDATE]: 2026-02-05 - 移除事件总线式滚动；改为 Viewport Following 自动滚动（Resize/Mutation + scroll metrics）
 * [UPDATE]: 2026-02-05 - threadId 仅用于重建 Conversation，确保视口状态重置
 * [UPDATE]: 2026-02-07 - 采用经典 chat 交互：默认底部锚定，AI 流式输出在底部追随；用户上滑则暂停追随；runStart 使用 `behavior:'smooth'`（一次）保证用户消息 + AI loading 可见
 * [UPDATE]: 2026-02-07 - runStart 增加消息入场动效（user + AI loading，160ms），增强“向上出现”的反馈（不影响初始化/切会话：仍为 auto）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import type { ChatStatus, UIMessage } from 'ai';

import { cn } from '../lib/utils';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from './conversation';
import { ConversationViewportFooter, useConversationViewportStore } from './conversation-viewport';

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

const RUN_START_ENTER_ANIMATION_MS = 160;
// RunStart 后的短窗口：用于捕获“AI loading 占位消息”可能的延迟插入。
const RUN_START_ENTER_WINDOW_MS = 500;

const RUN_START_ENTER_ANIMATION_CLASSNAME = cn(
  // Respect prefers-reduced-motion.
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2',
  `motion-safe:duration-[${RUN_START_ENTER_ANIMATION_MS}ms] motion-safe:ease-out`
);

const isAssistantLoadingMessage = (message: UIMessage) =>
  message.role === 'assistant' && (!message.parts || message.parts.length === 0);

const MessageListInner = ({
  messages,
  status,
  renderMessage,
  emptyState,
  contentClassName,
  showScrollButton = true,
  footer,
}: MessageListInnerProps) => {
  const viewportStore = useConversationViewportStore();
  const prevStatusRef = useRef<ChatStatus>(status);
  const prevMessagesRef = useRef<UIMessage[]>(messages);
  const runStartUserIdRef = useRef<string | null>(null);
  const runStartAssistantIdRef = useRef<string | null>(null);
  const runStartAnimationUntilRef = useRef<number>(0);

  const prevStatus = prevStatusRef.current;
  const shouldScrollOnRunStart = isRunningStatus(status) && !isRunningStatus(prevStatus);

  const prevMessages = prevMessagesRef.current;
  const appendedMessages =
    messages.length > prevMessages.length ? messages.slice(prevMessages.length) : [];

  // Only animate on user runStart (not on first mount / thread switch).
  const appendedUserId = appendedMessages.find((m) => m.role === 'user')?.id ?? null;
  const runStartUserId = shouldScrollOnRunStart ? appendedUserId : null;

  // Animate "user message + AI loading" during a short runStart window so the animation doesn't get
  // interrupted by quick rerenders (e.g. submitted -> streaming).
  const now = typeof performance === 'undefined' ? Date.now() : performance.now();
  const hasRunStartWindow = now < runStartAnimationUntilRef.current;
  const runStartUserIdForWindow =
    runStartUserId ?? (hasRunStartWindow ? (runStartUserIdRef.current ?? appendedUserId) : null);
  const runStartUserIndex = runStartUserIdForWindow
    ? messages.findIndex((m) => m.id === runStartUserIdForWindow)
    : -1;
  const runStartAssistantLoadingIdForRender =
    runStartUserIndex >= 0 &&
    runStartUserIndex + 1 < messages.length &&
    isAssistantLoadingMessage(messages[runStartUserIndex + 1]!)
      ? messages[runStartUserIndex + 1]!.id
      : null;

  const runStartAssistantIdForWindow = shouldScrollOnRunStart
    ? runStartAssistantLoadingIdForRender
    : (runStartAssistantIdRef.current ?? runStartAssistantLoadingIdForRender);

  const shouldAnimateMessageIdSet =
    shouldScrollOnRunStart || hasRunStartWindow
      ? new Set<string>(
          [runStartUserIdForWindow, runStartAssistantIdForWindow].filter((id): id is string =>
            Boolean(id)
          )
        )
      : null;

  // When the user submits a new message (run start), always bring them to the bottom.
  // This is the expected behavior in classic chat UIs and avoids "my message is not visible".
  useLayoutEffect(() => {
    const now = typeof performance === 'undefined' ? Date.now() : performance.now();

    if (shouldScrollOnRunStart) {
      runStartAnimationUntilRef.current = now + RUN_START_ENTER_WINDOW_MS;
      runStartUserIdRef.current = runStartUserId;
      runStartAssistantIdRef.current = runStartAssistantLoadingIdForRender;

      // 只在 runStart（用户发送）时 smooth；流式追随仍用 auto（instant）。
      viewportStore.getState().scrollToBottom({ behavior: 'smooth' });
    } else if (now < runStartAnimationUntilRef.current) {
      // status 可能先进入 running、消息后插入；在窗口期内捕获一次 userId/assistantId，确保动画不被 rerender 截断。
      if (!runStartUserIdRef.current && appendedUserId) {
        runStartUserIdRef.current = appendedUserId;
      }

      if (!runStartAssistantIdRef.current && runStartUserIdRef.current) {
        const userIndex = messages.findIndex((m) => m.id === runStartUserIdRef.current);
        const next = userIndex >= 0 ? messages[userIndex + 1] : undefined;
        if (next && isAssistantLoadingMessage(next)) {
          runStartAssistantIdRef.current = next.id;
        }
      }
    }

    prevMessagesRef.current = messages;
    prevStatusRef.current = status;
  }, [appendedUserId, messages, runStartUserId, shouldScrollOnRunStart, status, viewportStore]);

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
            const shouldAnimate = shouldAnimateMessageIdSet?.has(message.id) === true;
            return (
              <div
                key={message.id}
                data-slot={shouldAnimate ? 'message-enter' : undefined}
                className={shouldAnimate ? RUN_START_ENTER_ANIMATION_CLASSNAME : undefined}
              >
                {renderMessage({ message, index })}
              </div>
            );
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
