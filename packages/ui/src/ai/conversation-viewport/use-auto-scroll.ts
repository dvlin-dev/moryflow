/**
 * [PROVIDES]: useConversationViewportAutoScroll - 滚动状态与滚动到底部
 * [DEPENDS]: React
 * [POS]: Conversation Viewport 自动滚动与状态同步
 * [UPDATE]: 2026-02-03 - 对齐 assistant-ui，事件驱动 runStart/initialize/threadSwitch
 * [UPDATE]: 2026-02-03 - 记录距底距离与滚动状态，控制滚动按钮显隐
 * [UPDATE]: 2026-02-04 - AutoScroll 逻辑对齐 assistant-ui，移除额外滚动意图结算
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useCallback, useRef } from 'react';

import { useConversationViewportStore } from './context';
import { useManagedRef } from './use-managed-ref';
import { useOnAutoScrollEvent } from './use-on-auto-scroll-event';
import { useOnResizeContent } from './use-on-resize-content';
import { useOnScrollToBottom } from './use-on-scroll-to-bottom';

export type ConversationViewportAutoScrollOptions = {
  autoScroll?: boolean;
  scrollToBottomOnRunStart?: boolean;
  scrollToBottomOnInitialize?: boolean;
  scrollToBottomOnThreadSwitch?: boolean;
};

type ScrollBehaviorMode = ScrollBehavior | 'instant';

export const useConversationViewportAutoScroll = ({
  autoScroll,
  scrollToBottomOnRunStart = true,
  scrollToBottomOnInitialize = true,
  scrollToBottomOnThreadSwitch = true,
}: ConversationViewportAutoScrollOptions = {}) => {
  const store = useConversationViewportStore();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTop = useRef(0);
  const scrollingToBottomBehaviorRef = useRef<ScrollBehaviorMode | null>(null);

  if (autoScroll === undefined) {
    autoScroll = store.getState().turnAnchor !== 'top';
  }

  const setIsScrollingToBottom = useCallback(
    (next: boolean) => {
      if (store.getState().isScrollingToBottom !== next) {
        store.setState({ isScrollingToBottom: next });
      }
    },
    [store]
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

  const performScrollToBottom = useCallback(
    (behavior: ScrollBehaviorMode, track: boolean) => {
      const node = viewportRef.current;
      if (!node) return;
      if (track) {
        scrollingToBottomBehaviorRef.current = behavior;
        setIsScrollingToBottom(true);
      }
      if (behavior === 'instant') {
        node.scrollTop = node.scrollHeight;
      } else if (typeof node.scrollTo === 'function') {
        node.scrollTo({ top: node.scrollHeight, behavior });
      } else {
        node.scrollTop = node.scrollHeight;
      }
    },
    [setIsScrollingToBottom]
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehaviorMode) => {
      performScrollToBottom(behavior, true);
    },
    [performScrollToBottom]
  );

  const resizeRef = useOnResizeContent(() => {
    const scrollBehavior = scrollingToBottomBehaviorRef.current;
    if (scrollBehavior) {
      performScrollToBottom(scrollBehavior, false);
    } else if (autoScroll && store.getState().isAtBottom) {
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

  useOnAutoScrollEvent((event) => {
    if (event === 'runStart' && scrollToBottomOnRunStart) {
      scrollingToBottomBehaviorRef.current = 'auto';
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
      return;
    }
    if (event === 'initialize' && scrollToBottomOnInitialize) {
      scrollingToBottomBehaviorRef.current = 'instant';
      requestAnimationFrame(() => {
        scrollToBottom('instant');
      });
      return;
    }
    if (event === 'threadSwitch' && scrollToBottomOnThreadSwitch) {
      scrollingToBottomBehaviorRef.current = 'instant';
      requestAnimationFrame(() => {
        scrollToBottom('instant');
      });
    }
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
