/**
 * [PROPS]: ConversationViewportProps - 滚动容器与 Viewport 配置
 * [EMITS]: None
 * [POS]: Conversation Viewport 容器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { forwardRef, useCallback, useEffect } from 'react';
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
    const isAtBottom = useConversationViewport((state) => state.isAtBottom);
    const scrollToBottom = useConversationViewport((state) => state.scrollToBottom);

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
      if (!isAtBottom) return;
      scrollToBottom({ behavior: 'auto' });
    }, [height.inset, height.viewport, isAtBottom, scrollToBottom]);

    return (
      <div
        {...props}
        ref={setRef}
        className={cn('relative flex-1 overflow-y-auto', className)}
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
