/**
 * [PROPS]: ConversationViewportProps - 滚动容器与 Viewport 配置
 * [EMITS]: None
 * [POS]: Conversation Viewport 容器
 * [UPDATE]: 2026-02-03 - 视口改为纵向 flex，支持 Footer 下沉
 * [UPDATE]: 2026-02-03 - 移除 scroll-smooth，滚动曲线由触发行为控制
 * [UPDATE]: 2026-02-03 - 支持顶部 inset，避免消息被 header 遮挡
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

export type ConversationViewportProps = ComponentPropsWithoutRef<'div'> & {
  topInset?: number;
};

const useViewportSizeRef = () => {
  const register = useConversationViewport((state) => state.registerViewport);
  const getHeight = useCallback((el: HTMLElement) => el.clientHeight, []);
  return useSizeHandle(register, getHeight);
};

const ConversationViewportInner = forwardRef<HTMLDivElement, ConversationViewportProps>(
  ({ className, topInset, style, ...props }, ref) => {
    const autoScrollRef = useConversationViewportAutoScroll();
    const viewportRef = useViewportSizeRef();
    const setTopInset = useConversationViewport((state) => state.setTopInset);

    useEffect(() => {
      if (topInset === undefined) {
        return;
      }
      setTopInset(topInset);
    }, [setTopInset, topInset]);

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
        className={cn('relative flex flex-1 min-h-0 flex-col overflow-y-auto', className)}
        style={{
          scrollPaddingTop: topInset ?? undefined,
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
