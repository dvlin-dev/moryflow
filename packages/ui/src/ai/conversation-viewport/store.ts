/**
 * [PROVIDES]: ConversationViewportStore - 会话视口状态（isAtBottom/distanceFromBottom/scrollToBottom）
 * [DEPENDS]: zustand
 * [POS]: ConversationViewport 的最小状态：用于 scroll button 判定 + runStart/手动滚底触发
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { create } from 'zustand';

export type ConversationViewportState = {
  readonly isAtBottom: boolean;
  /** Distance to the bottom of the scroll container (px, rounded). */
  readonly distanceFromBottom: number;

  readonly scrollToBottom: (config?: { behavior?: ScrollBehavior | undefined }) => void;
  readonly onScrollToBottom: (
    callback: ({ behavior }: { behavior: ScrollBehavior }) => void
  ) => () => void;
};

export const makeConversationViewportStore = () => {
  const scrollToBottomListeners = new Set<(config: { behavior: ScrollBehavior }) => void>();
  let pendingScrollToBottom: { behavior: ScrollBehavior } | null = null;

  const store = create<ConversationViewportState>(() => ({
    isAtBottom: true,
    distanceFromBottom: 0,
    scrollToBottom: ({ behavior = 'auto' } = {}) => {
      if (scrollToBottomListeners.size === 0) {
        pendingScrollToBottom = { behavior };
        return;
      }
      for (const listener of scrollToBottomListeners) {
        listener({ behavior });
      }
    },
    onScrollToBottom: (callback) => {
      scrollToBottomListeners.add(callback);
      if (pendingScrollToBottom) {
        const pending = pendingScrollToBottom;
        pendingScrollToBottom = null;
        callback(pending);
      }
      return () => {
        scrollToBottomListeners.delete(callback);
      };
    },
  }));

  return store;
};
