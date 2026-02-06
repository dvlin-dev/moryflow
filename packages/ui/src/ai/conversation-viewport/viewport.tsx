/**
 * [PROPS]: ConversationViewportProps - 滚动容器与 Viewport 配置
 * [EMITS]: None
 * [POS]: Conversation Viewport 容器（对齐 assistant-ui ThreadPrimitive.Viewport）
 * [UPDATE]: 2026-02-05 - 移除高度注册与自研滚动状态，改为 assistant-ui auto-scroll
 * [UPDATE]: 2026-02-05 - 对齐 assistant-ui 最新版 Viewport 结构（turnAnchor + size handle）
 * [UPDATE]: 2026-02-05 - 开启 scroll-smooth，恢复 runStart 滚动动画
 * [UPDATE]: 2026-02-05 - scrollbar-gutter stable，避免滚动条引发消息高度抖动
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { forwardRef, useCallback } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';

import { cn } from '../../lib/utils';
import { useSizeHandle } from '../assistant-ui/utils/hooks/useSizeHandle';
import { ConversationViewportProvider, useConversationViewport } from './context';
import { useConversationViewportAutoScroll } from './use-auto-scroll';

export type ConversationViewportProps = ComponentPropsWithoutRef<'div'> & {
  autoScroll?: boolean;
  turnAnchor?: 'top' | 'bottom';
  scrollToBottomOnRunStart?: boolean;
  scrollToBottomOnInitialize?: boolean;
  scrollToBottomOnThreadSwitch?: boolean;
};

const useViewportSizeRef = () => {
  const register = useConversationViewport((state) => state.registerViewport);
  const getHeight = useCallback((el: HTMLElement) => el.clientHeight, []);
  return useSizeHandle(register, getHeight);
};

const ConversationViewportInner = forwardRef<HTMLDivElement, ConversationViewportProps>(
  (
    {
      className,
      autoScroll,
      scrollToBottomOnRunStart,
      scrollToBottomOnInitialize,
      scrollToBottomOnThreadSwitch,
      ...props
    },
    ref
  ) => {
    const autoScrollRef = useConversationViewportAutoScroll({
      autoScroll,
      scrollToBottomOnRunStart,
      scrollToBottomOnInitialize,
      scrollToBottomOnThreadSwitch,
    });
    const viewportSizeRef = useViewportSizeRef();
    const composedRef = useComposedRefs(ref, autoScrollRef, viewportSizeRef);
    const mergedStyle: CSSProperties = {
      scrollbarGutter: 'stable',
      ...(props.style ?? {}),
    };

    return (
      <div
        {...props}
        ref={composedRef}
        data-slot="conversation-viewport"
        style={mergedStyle}
        className={cn(
          'relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-auto scroll-smooth',
          className
        )}
        role={props.role ?? 'log'}
      />
    );
  }
);

ConversationViewportInner.displayName = 'ConversationViewportInner';

export const ConversationViewport = forwardRef<HTMLDivElement, ConversationViewportProps>(
  ({ children, turnAnchor = 'top', ...props }, ref) => (
    <ConversationViewportProvider options={{ turnAnchor }}>
      <ConversationViewportInner ref={ref} {...props}>
        {children}
      </ConversationViewportInner>
    </ConversationViewportProvider>
  )
);

ConversationViewport.displayName = 'ConversationViewport';
