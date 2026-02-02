/**
 * [PROVIDES]: useConversationViewportAutoScroll - 滚动状态与滚动到底部
 * [DEPENDS]: React
 * [POS]: Conversation Viewport 自动滚动与状态同步
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useConversationViewportStore } from './context';

const getIsAtBottom = (el: HTMLElement) => {
  const distance = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight);
  return distance < 1 || el.scrollHeight <= el.clientHeight;
};

export const useConversationViewportAutoScroll = () => {
  const store = useConversationViewportStore();
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const node = viewportRef.current;
    if (!node) return;
    if (typeof node.scrollTo === 'function') {
      node.scrollTo({ top: node.scrollHeight, behavior });
    } else {
      node.scrollTop = node.scrollHeight;
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
        handleScroll();
      }
    },
    [handleScroll]
  );

  return {
    attachRef,
  };
};
