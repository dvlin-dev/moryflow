/**
 * [PROPS]: MessageListProps - 消息列表渲染配置
 * [EMITS]: None
 * [POS]: AI 会话列表的通用布局封装
 * [UPDATE]: 2026-02-02 - footer 移至列表外，确保输入区固定底部
 * [UPDATE]: 2026-02-02 - 支持 loading 占位，发送后用户消息顶到顶部
 * [UPDATE]: 2026-02-02 - 追加自动滚动策略与新消息平滑滚动
 * [UPDATE]: 2026-02-02 - 会话切换时反复确认滚动到底部
 * [UPDATE]: 2026-02-02 - 发送消息时平滑滚动并避免自动滚动干扰
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import type { ChatStatus, UIMessage } from 'ai';

import { cn } from '../lib/utils';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from './conversation';
import { ConversationViewportSlack, useConversationViewport } from './conversation-viewport';
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
  loading?: ReactNode;
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
  | 'loading'
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
  loading,
  threadId,
}: MessageListInnerProps) => {
  const scrollToBottom = useConversationViewport((state) => state.scrollToBottom);
  const autoScrollEnabled = useConversationViewport((state) => state.autoScrollEnabled);
  const enableAutoScroll = useConversationViewport((state) => state.enableAutoScroll);
  const skipAutoScrollOnce = useConversationViewport((state) => state.skipAutoScrollOnce);
  const clearSkipAutoScroll = useConversationViewport((state) => state.clearSkipAutoScroll);
  const isAtBottom = useConversationViewport((state) => state.isAtBottom);
  const viewportHeight = useConversationViewport((state) => state.height.viewport);
  const insetHeight = useConversationViewport((state) => state.height.inset);
  const userMessageHeight = useConversationViewport((state) => state.height.userMessage);

  const conversationKey = threadId ?? messages[0]?.id ?? 'empty';
  const previousStatusRef = useRef<ChatStatus | null>(null);
  const previousConversationKeyRef = useRef<string | null>(null);
  const previousCountRef = useRef(0);
  const previousLastIdRef = useRef<string | null>(null);
  const pendingInitialScrollRef = useRef(false);
  const initialScrollAttemptsRef = useRef(0);
  const pendingUserScrollRef = useRef(false);
  const pendingUserScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageIndex = messages.length - 1;
  const lastMessage = messages[lastMessageIndex];
  const isLoadingStatus = status === 'submitted' || status === 'streaming';
  const lastIsUser = lastMessage?.role === 'user';
  const lastIsAssistant = lastMessage?.role === 'assistant';
  const lastAssistantEmpty = lastIsAssistant && (lastMessage?.parts?.length ?? 0) === 0;
  const injectLoadingAfter = Boolean(loading) && isLoadingStatus && lastIsUser;
  const replaceLastWithLoading = Boolean(loading) && isLoadingStatus && lastAssistantEmpty;
  const shouldApplySlack =
    (lastMessageIndex >= 1 && lastIsAssistant && messages[lastMessageIndex - 1]?.role === 'user') ||
    injectLoadingAfter;
  const anchorUserIndex = lastIsUser
    ? lastMessageIndex
    : lastIsAssistant && messages[lastMessageIndex - 1]?.role === 'user'
      ? lastMessageIndex - 1
      : -1;

  const clearPendingUserScrollTimeout = useCallback(() => {
    if (pendingUserScrollTimeoutRef.current) {
      clearTimeout(pendingUserScrollTimeoutRef.current);
      pendingUserScrollTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    pendingInitialScrollRef.current = true;
    initialScrollAttemptsRef.current = 0;
    pendingUserScrollRef.current = false;
    clearPendingUserScrollTimeout();
    clearSkipAutoScroll();
    enableAutoScroll();
  }, [clearSkipAutoScroll, conversationKey, enableAutoScroll, scrollToBottom]);

  useEffect(() => {
    const prevStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status === 'submitted' && prevStatus !== 'submitted') {
      enableAutoScroll();
    }
  }, [enableAutoScroll, status]);

  useEffect(() => {
    if (!pendingInitialScrollRef.current) {
      return;
    }
    if (messages.length === 0) {
      return;
    }
    if (!autoScrollEnabled) {
      return;
    }

    if (initialScrollAttemptsRef.current > 0 && isAtBottom) {
      pendingInitialScrollRef.current = false;
      return;
    }

    initialScrollAttemptsRef.current += 1;
    scrollToBottom({ behavior: 'auto' });
  }, [
    autoScrollEnabled,
    conversationKey,
    insetHeight,
    isAtBottom,
    messages.length,
    scrollToBottom,
    userMessageHeight,
    viewportHeight,
  ]);

  useEffect(() => {
    if (!autoScrollEnabled || status !== 'streaming') return;
    if (pendingUserScrollRef.current) return;
    scrollToBottom({ behavior: 'auto' });
  }, [autoScrollEnabled, messages, scrollToBottom, status]);

  useLayoutEffect(() => {
    if (previousConversationKeyRef.current !== conversationKey) {
      previousConversationKeyRef.current = conversationKey;
      previousCountRef.current = messages.length;
      previousLastIdRef.current = lastMessage?.id ?? null;
      return;
    }
    const prevCount = previousCountRef.current;
    const prevLastId = previousLastIdRef.current;
    previousCountRef.current = messages.length;
    previousLastIdRef.current = lastMessage?.id ?? null;

    if (prevCount === 0) {
      return;
    }
    if (!lastMessage || lastMessage.role !== 'user') {
      return;
    }
    if (prevLastId === lastMessage.id) {
      return;
    }
    enableAutoScroll();
    pendingUserScrollRef.current = true;
    skipAutoScrollOnce();
    clearPendingUserScrollTimeout();
    pendingUserScrollTimeoutRef.current = setTimeout(() => {
      if (!pendingUserScrollRef.current) {
        return;
      }
      pendingUserScrollRef.current = false;
      clearSkipAutoScroll();
      scrollToBottom({ behavior: 'auto' });
      pendingUserScrollTimeoutRef.current = null;
    }, 200);
  }, [
    clearSkipAutoScroll,
    conversationKey,
    enableAutoScroll,
    lastMessage,
    messages.length,
    scrollToBottom,
    skipAutoScrollOnce,
  ]);

  useEffect(() => {
    if (!pendingUserScrollRef.current) {
      return;
    }
    if (!lastMessage || lastMessage.role !== 'user') {
      return;
    }
    if (userMessageHeight <= 0 || viewportHeight <= 0) {
      return;
    }

    const runScroll = () => {
      clearPendingUserScrollTimeout();
      pendingUserScrollRef.current = false;
      scrollToBottom({ behavior: 'smooth' });
      clearSkipAutoScroll();
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        runScroll();
      });
      return;
    }

    setTimeout(runScroll, 0);
  }, [
    clearSkipAutoScroll,
    clearPendingUserScrollTimeout,
    insetHeight,
    lastMessage?.id,
    scrollToBottom,
    userMessageHeight,
    viewportHeight,
  ]);

  useEffect(() => {
    return () => {
      clearPendingUserScrollTimeout();
    };
  }, [clearPendingUserScrollTimeout]);

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
            const shouldReplace = replaceLastWithLoading && index === lastMessageIndex;
            let node = shouldReplace && loading ? loading : renderMessage({ message, index });

            if (index === anchorUserIndex) {
              node = <AnchorUserMessage>{node}</AnchorUserMessage>;
            }

            if (!injectLoadingAfter && index === lastMessageIndex && shouldApplySlack) {
              node = <ConversationViewportSlack enabled>{node}</ConversationViewportSlack>;
            }

            return <Fragment key={message.id}>{node}</Fragment>;
          })}
          {injectLoadingAfter && loading ? (
            <ConversationViewportSlack enabled>{loading}</ConversationViewportSlack>
          ) : null}
        </ConversationContent>
      )}

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
  loading,
  threadId,
  ...props
}: MessageListProps) => {
  return (
    <div className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden', className)} {...props}>
      <Conversation className={conversationClassName}>
        <MessageListInner
          messages={messages}
          status={status}
          renderMessage={renderMessage}
          emptyState={emptyState}
          contentClassName={contentClassName}
          showScrollButton={showScrollButton}
          loading={loading}
          threadId={threadId}
        />
      </Conversation>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
};
