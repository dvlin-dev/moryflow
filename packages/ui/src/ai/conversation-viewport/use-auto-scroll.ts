/**
 * [PROVIDES]: useConversationViewportAutoScroll - 滚动状态与滚动到底部
 * [DEPENDS]: React
 * [POS]: Conversation Viewport 自动滚动与状态同步
 * [UPDATE]: 2026-02-03 - top anchor 初始/内容变更保持贴底，避免停留中间
 * [UPDATE]: 2026-02-03 - 记录距底距离与滚动状态，控制滚动按钮显隐
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useCallback, useRef } from 'react';

import { useConversationViewportStore } from './context';
import { useManagedRef } from './use-managed-ref';
import { useOnResizeContent } from './use-on-resize-content';
import { useOnScrollToBottom } from './use-on-scroll-to-bottom';

export type ConversationViewportAutoScrollOptions = {
  autoScroll?: boolean;
};

export const useConversationViewportAutoScroll = ({
  autoScroll,
}: ConversationViewportAutoScrollOptions = {}) => {
  const store = useConversationViewportStore();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTop = useRef(0);
  const scrollingToBottomBehaviorRef = useRef<ScrollBehavior | null>(null);
  const hasAutoScrollOverride = autoScroll !== undefined;

  if (autoScroll === undefined) {
    autoScroll = store.getState().turnAnchor !== 'top';
  }
  const shouldStickToBottom = autoScroll || !hasAutoScrollOverride;

  const setIsScrollingToBottom = useCallback(
    (next: boolean) => {
      if (store.getState().isScrollingToBottom !== next) {
        store.setState({ isScrollingToBottom: next });
      }
    },
    [store]
  );

  const performScrollToBottom = useCallback(
    (behavior: ScrollBehavior, track: boolean) => {
      const node = viewportRef.current;
      if (!node) return;
      if (track) {
        scrollingToBottomBehaviorRef.current = behavior;
        setIsScrollingToBottom(true);
      }
      if (typeof node.scrollTo === 'function') {
        node.scrollTo({ top: node.scrollHeight, behavior });
      } else {
        node.scrollTop = node.scrollHeight;
      }
    },
    [setIsScrollingToBottom]
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      performScrollToBottom(behavior, true);
    },
    [performScrollToBottom]
  );

  const handleScroll = useCallback(() => {
    const node = viewportRef.current;
    if (!node) return;

    const state = store.getState();
    const distanceToBottom = Math.max(0, node.scrollHeight - node.scrollTop - node.clientHeight);
    const nextIsAtBottom = distanceToBottom < 1 || node.scrollHeight <= node.clientHeight;

    const updates: Partial<ReturnType<typeof store.getState>> = {};
    if (state.distanceToBottom !== distanceToBottom) {
      updates.distanceToBottom = distanceToBottom;
    }

    if (!nextIsAtBottom && lastScrollTop.current < node.scrollTop) {
      // ignore scroll down while away from bottom
    } else {
      if (
        scrollingToBottomBehaviorRef.current &&
        !nextIsAtBottom &&
        lastScrollTop.current > node.scrollTop
      ) {
        // 用户主动上滚时解除滚动锁，避免强制拉回
        scrollingToBottomBehaviorRef.current = null;
        setIsScrollingToBottom(false);
      }

      if (nextIsAtBottom && scrollingToBottomBehaviorRef.current) {
        scrollingToBottomBehaviorRef.current = null;
        setIsScrollingToBottom(false);
      }

      const shouldUpdate = nextIsAtBottom || scrollingToBottomBehaviorRef.current === null;

      if (shouldUpdate && nextIsAtBottom !== state.isAtBottom) {
        updates.isAtBottom = nextIsAtBottom;
      }
    }
    if (Object.keys(updates).length > 0) {
      store.setState(updates);
    }

    lastScrollTop.current = node.scrollTop;
  }, [setIsScrollingToBottom, store]);

  const resizeRef = useOnResizeContent(() => {
    const scrollBehavior = scrollingToBottomBehaviorRef.current;
    if (scrollBehavior) {
      performScrollToBottom(scrollBehavior, true);
    } else if (shouldStickToBottom && store.getState().isAtBottom) {
      performScrollToBottom('instant', false);
    }

    handleScroll();
  });

  const scrollRef = useManagedRef<HTMLElement>((el) => {
    el.addEventListener('scroll', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  });

  useOnScrollToBottom(({ behavior }) => {
    scrollToBottom(behavior);
  });

  return useManagedRef<HTMLDivElement>((node) => {
    viewportRef.current = node;
    resizeRef(node);
    scrollRef(node);
    handleScroll();

    return () => {
      viewportRef.current = null;
      resizeRef(null);
      scrollRef(null);
    };
  });
};
