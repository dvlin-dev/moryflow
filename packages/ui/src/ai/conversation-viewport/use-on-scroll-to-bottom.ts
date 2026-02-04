/**
 * [PROVIDES]: useOnScrollToBottom - 滚动到底部事件订阅
 * [DEPENDS]: React
 * [POS]: Conversation Viewport 事件订阅工具
 * [UPDATE]: 2026-02-03 - 支持 instant 滚动行为
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useEffect, useRef } from 'react';

import { useConversationViewport } from './context';

export const useOnScrollToBottom = (
  callback: (config: { behavior: ScrollBehavior | 'instant' }) => void
) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const onScrollToBottom = useConversationViewport((state) => state.onScrollToBottom);

  useEffect(() => {
    return onScrollToBottom(({ behavior }) => callbackRef.current({ behavior }));
  }, [onScrollToBottom]);
};
