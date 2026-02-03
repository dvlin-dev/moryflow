/**
 * [PROPS]: ConversationViewportProps - 滚动容器与 Viewport 配置
 * [EMITS]: None
 * [POS]: Conversation Viewport 容器
 * [UPDATE]: 2026-02-02 - scroll 容器允许收缩以启用滚动
 * [UPDATE]: 2026-02-02 - auto scroll 受用户滚动意图控制
 * [UPDATE]: 2026-02-02 - 跳过自动滚动时由上层手动恢复
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { forwardRef, useCallback, useEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/utils';
import { useSizeHandle } from './use-size-handle';
import { ConversationViewportProvider, useConversationViewport } from './context';
import { useConversationViewportAutoScroll } from './use-auto-scroll';

export type ConversationViewportProps = ComponentPropsWithoutRef<'div'>;

const useViewportSizeRef = () => {
  const register = useConversationViewport((state) => state.registerViewport);
  const getHeight = useCallback((el: HTMLElement) => el.clientHeight, []);
  return useSizeHandle(register, getHeight);
};

const ConversationViewportInner = forwardRef<HTMLDivElement, ConversationViewportProps>(
  ({ className, ...props }, ref) => {
    const { attachRef } = useConversationViewportAutoScroll();
    const viewportRef = useViewportSizeRef();
    const height = useConversationViewport((state) => state.height);
    const autoScrollEnabled = useConversationViewport((state) => state.autoScrollEnabled);
    const scrollToBottom = useConversationViewport((state) => state.scrollToBottom);
    const skipNextAutoScroll = useConversationViewport((state) => state.skipNextAutoScroll);
    const lastHeightRef = useRef<string | null>(null);

    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
        viewportRef(node);
        attachRef(node);
      },
      [attachRef, ref, viewportRef]
    );

    useEffect(() => {
      const nextSignature = `${height.inset}|${height.userMessage}|${height.viewport}`;
      const heightChanged = lastHeightRef.current !== nextSignature;
      lastHeightRef.current = nextSignature;

      if (!heightChanged) return;
      if (!autoScrollEnabled) return;
      if (skipNextAutoScroll) return;
      scrollToBottom({ behavior: 'auto' });
    }, [
      autoScrollEnabled,
      height.inset,
      height.userMessage,
      height.viewport,
      scrollToBottom,
      skipNextAutoScroll,
    ]);

    return (
      <div
        {...props}
        ref={setRef}
        className={cn('relative flex-1 min-h-0 overflow-y-auto', className)}
        role={props.role ?? 'log'}
      />
    );
  }
);

ConversationViewportInner.displayName = 'ConversationViewportInner';

export const ConversationViewport = forwardRef<HTMLDivElement, ConversationViewportProps>(
  ({ children, ...props }, ref) => (
    <ConversationViewportProvider>
      <ConversationViewportInner ref={ref} {...props}>
        {children}
      </ConversationViewportInner>
    </ConversationViewportProvider>
  )
);

ConversationViewport.displayName = 'ConversationViewport';
