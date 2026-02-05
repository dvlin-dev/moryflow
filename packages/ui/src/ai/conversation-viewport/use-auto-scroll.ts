/**
 * [PROVIDES]: useConversationViewportAutoScroll - assistant-ui 自动滚动封装
 * [DEPENDS]: assistant-ui useThreadViewportAutoScroll
 * [POS]: Conversation Viewport 自动滚动入口（对齐 assistant-ui）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { RefCallback } from 'react';

import { useThreadViewportAutoScroll } from '../assistant-ui/primitives/thread/useThreadViewportAutoScroll';

export type ConversationViewportAutoScrollOptions = {
  autoScroll?: boolean | undefined;
  scrollToBottomOnRunStart?: boolean | undefined;
  scrollToBottomOnInitialize?: boolean | undefined;
  scrollToBottomOnThreadSwitch?: boolean | undefined;
};

export const useConversationViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll,
  scrollToBottomOnRunStart,
  scrollToBottomOnInitialize,
  scrollToBottomOnThreadSwitch,
}: ConversationViewportAutoScrollOptions = {}): RefCallback<TElement> => {
  return useThreadViewportAutoScroll<TElement>({
    autoScroll,
    scrollToBottomOnRunStart,
    scrollToBottomOnInitialize,
    scrollToBottomOnThreadSwitch,
  });
};
