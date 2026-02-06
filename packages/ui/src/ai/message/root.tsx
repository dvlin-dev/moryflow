/**
 * [PROPS]: MessageRootProps - 会话消息 Root 组件
 * [EMITS]: None
 * [POS]: 对话场景消息容器（对齐 assistant-ui MessagePrimitive.Root）
 * [UPDATE]: 2026-02-05 - 移除 Slack/锚点注册，仅保留基础容器
 * [UPDATE]: 2026-02-05 - 对齐 assistant-ui 最新版锚点/Slack 机制
 * [UPDATE]: 2026-02-05 - 锚点高度始终绑定最后一条 user，避免短列表闪烁
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { forwardRef, useCallback } from 'react';

import { useSizeHandle } from '../assistant-ui/utils/hooks/useSizeHandle';
import { ConversationViewportSlack, useConversationViewport } from '../conversation-viewport';
import { useConversationMessage } from './context';
import { Message } from './base';
import type { MessageProps } from './const';

export type MessageRootProps = MessageProps;

const useMessageViewportRef = () => {
  const turnAnchor = useConversationViewport((state) => state.turnAnchor);
  const registerUserHeight = useConversationViewport((state) => state.registerUserMessageHeight);
  const messageContext = useConversationMessage({ optional: true });

  let lastUserIndex = -1;
  if (messageContext) {
    for (let i = messageContext.messages.length - 1; i >= 0; i -= 1) {
      if (messageContext.messages[i]?.role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
  }

  const shouldRegisterAsInset =
    turnAnchor === 'top' &&
    messageContext?.message.role === 'user' &&
    messageContext.index === lastUserIndex;

  const getHeight = useCallback((el: HTMLElement) => el.offsetHeight, []);

  return useSizeHandle(shouldRegisterAsInset ? registerUserHeight : null, getHeight);
};

export const MessageRoot = forwardRef<HTMLDivElement, MessageRootProps>(
  ({ className, ...props }, ref) => {
    const anchorUserMessageRef = useMessageViewportRef();
    const composedRef = useComposedRefs(ref, anchorUserMessageRef);

    return (
      <ConversationViewportSlack>
        <Message ref={composedRef} className={className} {...props} />
      </ConversationViewportSlack>
    );
  }
);

MessageRoot.displayName = 'MessageRoot';
