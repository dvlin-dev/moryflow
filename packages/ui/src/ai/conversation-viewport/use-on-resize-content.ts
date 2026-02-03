/**
 * [PROVIDES]: useOnResizeContent - 内容变化监听
 * [DEPENDS]: React, ResizeObserver, MutationObserver
 * [POS]: Conversation Viewport 内容变化回调
 * [UPDATE]: 2026-02-03 - Resize/Mutation 回调使用 rAF 节流
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useManagedRef } from './use-managed-ref';

export const useOnResizeContent = (callback: () => void) => {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const refCallback = useCallback((el: HTMLElement) => {
    const schedule = () => {
      if (frameRef.current !== null) {
        return;
      }
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        callbackRef.current();
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      schedule();
    });

    const mutationObserver = new MutationObserver((mutations) => {
      const hasRelevantMutation = mutations.some(
        (mutation) => mutation.type !== 'attributes' || mutation.attributeName !== 'style'
      );
      if (hasRelevantMutation) {
        schedule();
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
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return useManagedRef(refCallback);
};
