/**
 * [PROVIDES]: useOnAutoScrollEvent - 自动滚动事件订阅
 * [DEPENDS]: React
 * [POS]: Conversation Viewport AutoScroll 事件订阅工具
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

import { useConversationViewport } from './context';
import type { ConversationViewportAutoScrollEvent } from './store';

export const useOnAutoScrollEvent = (
  callback: (event: ConversationViewportAutoScrollEvent) => void
) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const onAutoScrollEvent = useConversationViewport((state) => state.onAutoScrollEvent);

  useLayoutEffect(() => {
    return onAutoScrollEvent((event) => callbackRef.current(event));
  }, [onAutoScrollEvent]);
};
