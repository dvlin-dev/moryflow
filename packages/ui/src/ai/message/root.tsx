/**
 * [PROPS]: MessageRootProps - 会话消息 Root 组件
 * [EMITS]: None
 * [POS]: 对话场景消息锚点/Slack 注入层（对齐 assistant-ui）
 * [UPDATE]: 2026-02-03 - 锚点高度注册与 Slack 逻辑内聚到 Root
 * [UPDATE]: 2026-02-04 - 仅保留锚点注册逻辑，Slack 由内部判断条件
 * [UPDATE]: 2026-02-04 - runStart 触发延后至 assistant 渲染后执行
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react';
import type { UIMessage } from 'ai';

import { ConversationViewportSlack } from '../conversation-viewport';
import { useConversationViewportStoreOptional } from '../conversation-viewport/context';
import { useSizeHandle } from '../conversation-viewport/use-size-handle';
import { Message } from './base';
import { useConversationMessage } from './context';
import type { MessageProps } from './const';

export type MessageRootProps = MessageProps;

type ViewportFlagsInput = {
  hasViewport: boolean;
  turnAnchor?: 'top';
  messageRole?: UIMessage['role'];
  messages: UIMessage[];
  index: number;
};

export const getMessageViewportFlags = ({
  hasViewport,
  turnAnchor,
  messageRole,
  messages,
  index,
}: ViewportFlagsInput) => {
  const lastIndex = messages.length - 1;
  const lastMessage = messages[lastIndex];
  const isLastMessageUser = lastMessage?.role === 'user';
  const isLastMessageAssistant = lastMessage?.role === 'assistant';

  const shouldRegisterUser =
    hasViewport &&
    turnAnchor === 'top' &&
    messageRole === 'user' &&
    ((isLastMessageAssistant && index === lastIndex - 1) ||
      (isLastMessageUser && index === lastIndex));

  return { shouldRegisterUser };
};

export const MessageRoot = forwardRef<HTMLDivElement, MessageRootProps>(
  ({ className, ...props }, ref) => {
    const messageContext = useConversationMessage({ optional: true });
    const viewportStore = useConversationViewportStoreOptional();
    const runStartEmittedRef = useRef<string | null>(null);

    const turnAnchor = viewportStore?.getState().turnAnchor;
    const messages = messageContext?.messages ?? [];
    const message = messageContext?.message;
    const index = messageContext?.index ?? -1;
    const status = messageContext?.status;

    const { shouldRegisterUser } = getMessageViewportFlags({
      hasViewport: Boolean(viewportStore),
      turnAnchor,
      messageRole: message?.role,
      messages,
      index,
    });

    const register = shouldRegisterUser
      ? viewportStore?.getState().registerUserMessageHeight
      : null;
    const anchorRef = useSizeHandle(register);

    const isRunning = status === 'submitted' || status === 'streaming';
    const shouldEmitRunStart = Boolean(
      viewportStore &&
      message &&
      isRunning &&
      message.role === 'assistant' &&
      index >= 1 &&
      index === messages.length - 1 &&
      messages[index - 1]?.role === 'user'
    );

    useLayoutEffect(() => {
      if (!viewportStore || !shouldEmitRunStart || !message) return;

      if (runStartEmittedRef.current === message.id) return;
      runStartEmittedRef.current = message.id;

      let attempts = 0;
      let rafId: number | null = null;
      const tryEmit = () => {
        const height = viewportStore.getState().height;
        const isReady = height.viewport > 0 && height.userMessage > 0;
        if (isReady || attempts >= 2) {
          viewportStore.getState().emitAutoScrollEvent('runStart');
          return;
        }
        attempts += 1;
        rafId = requestAnimationFrame(tryEmit);
      };

      rafId = requestAnimationFrame(tryEmit);
      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }, [message, shouldEmitRunStart, viewportStore]);

    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
        anchorRef(node);
      },
      [anchorRef, ref]
    );

    return (
      <ConversationViewportSlack>
        <Message ref={setRef} className={className} {...props} />
      </ConversationViewportSlack>
    );
  }
);

MessageRoot.displayName = 'MessageRoot';
