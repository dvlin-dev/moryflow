/**
 * [PROVIDES]: useOnResizeContent - 内容变化监听
 * [DEPENDS]: React, ResizeObserver, MutationObserver
 * [POS]: Conversation Viewport 内容变化回调
 * [UPDATE]: 2026-02-03 - 过滤 style-only 变更，避免 Slack 触发反馈循环
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useManagedRef } from './use-managed-ref';

export const useOnResizeContent = (callback: () => void) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const refCallback = useCallback((el: HTMLElement) => {
    const resizeObserver = new ResizeObserver(() => {
      callbackRef.current();
    });

    const mutationObserver = new MutationObserver((mutations) => {
      const hasRelevantMutation = mutations.some((mutation) => {
        return mutation.type !== 'attributes' || mutation.attributeName !== 'style';
      });
      if (hasRelevantMutation) {
        callbackRef.current();
      }
    });

    resizeObserver.observe(el);
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return useManagedRef(refCallback);
};
