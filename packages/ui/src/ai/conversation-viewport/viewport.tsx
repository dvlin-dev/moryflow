/**
 * [PROPS]: ConversationViewportProps - 滚动容器与 Viewport 配置
 * [EMITS]: None
 * [POS]: Conversation Viewport 容器
 * [UPDATE]: 2026-02-03 - 视口改为纵向 flex，支持 Footer 下沉
 * [UPDATE]: 2026-02-04 - 移除顶部 inset 与滚动条固定策略，严格对齐 assistant-ui
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { forwardRef, useCallback } from 'react';
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
  ({ className, style, ...props }, ref) => {
    const autoScrollRef = useConversationViewportAutoScroll();
    const viewportRef = useViewportSizeRef();

    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
        viewportRef(node);
        autoScrollRef(node);
      },
      [autoScrollRef, ref, viewportRef]
    );

    return (
      <div
        {...props}
        ref={setRef}
        className={cn(
          'relative flex flex-1 min-h-0 flex-col overflow-x-auto overflow-y-scroll',
          className
        )}
        style={{
          ...style,
        }}
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
