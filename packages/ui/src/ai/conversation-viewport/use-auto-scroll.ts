/**
 * [PROVIDES]: useConversationViewportAutoScroll - 滚动状态与滚动到底部
 * [DEPENDS]: React
 * [POS]: Conversation Viewport 自动滚动与状态同步
 * [UPDATE]: 2026-02-02 - 支持自动滚动锁与用户滚动意图识别
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useConversationViewportStore } from './context';

const BOTTOM_THRESHOLD = 24;

const getIsAtBottom = (el: HTMLElement) => {
  const distance = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight);
  return distance <= BOTTOM_THRESHOLD || el.scrollHeight <= el.clientHeight;
};

export const useConversationViewportAutoScroll = () => {
  const store = useConversationViewportStore();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const programmaticScrollRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const node = viewportRef.current;
    if (!node) return;
    programmaticScrollRef.current = true;
    if (typeof node.scrollTo === 'function') {
      node.scrollTo({ top: node.scrollHeight, behavior });
    } else {
      node.scrollTop = node.scrollHeight;
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
      });
    } else {
      setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 0);
    }
  }, []);

  useEffect(() => {
    return store.getState().onScrollToBottom(({ behavior }) => {
      scrollToBottom(behavior);
    });
  }, [scrollToBottom, store]);

  const handleScroll = useCallback(() => {
    const node = viewportRef.current;
    if (!node) return;
    const nextIsAtBottom = getIsAtBottom(node);
    const nextScrollTop = node.scrollTop;
    const prevScrollTop = lastScrollTopRef.current;
    const scrolledUp = nextScrollTop < prevScrollTop - 1;
    lastScrollTopRef.current = nextScrollTop;

    if (!programmaticScrollRef.current) {
      if (scrolledUp && store.getState().autoScrollEnabled) {
        store.setState({ autoScrollEnabled: false });
      } else if (nextIsAtBottom && !store.getState().autoScrollEnabled) {
        store.setState({ autoScrollEnabled: true });
      }
    } else if (nextIsAtBottom && !store.getState().autoScrollEnabled) {
      store.setState({ autoScrollEnabled: true });
    }

    if (nextIsAtBottom !== store.getState().isAtBottom) {
      store.setState({ isAtBottom: nextIsAtBottom });
    }
  }, [store]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    handleScroll();
    node.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      node.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const attachRef = useCallback(
    (node: HTMLDivElement | null) => {
      viewportRef.current = node;
      if (node) {
        lastScrollTopRef.current = node.scrollTop;
        handleScroll();
      }
    },
    [handleScroll]
  );

  return {
    attachRef,
  };
};
