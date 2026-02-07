/**
 * [PROPS]: ConversationViewportProps - 滚动容器与 Viewport 配置
 * [EMITS]: None
 * [POS]: Conversation Viewport 滚动容器（bottom-anchor + Following 自动滚动）
 * [UPDATE]: 2026-02-05 - 移除高度注册与测量驱动方案，改为 Following 自动滚动
 * [UPDATE]: 2026-02-07 - 回归经典 chat：移除 turnAnchor/size handle，滚动动画由 scrollTo({behavior:'smooth'}) 显式控制
 * [UPDATE]: 2026-02-07 - 禁用 overflow-anchor，避免浏览器滚动锚定与 AutoScroll 冲突导致闪烁
 * [UPDATE]: 2026-02-05 - scrollbar-gutter stable，避免滚动条引发消息高度抖动
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';

import { cn } from '../../lib/utils';
import { ConversationViewportProvider } from './context';
import { useConversationViewportAutoScroll } from './use-auto-scroll';

export type ConversationViewportProps = ComponentPropsWithoutRef<'div'> & {
  autoScroll?: boolean;
};

const ConversationViewportInner = forwardRef<HTMLDivElement, ConversationViewportProps>(
  ({ className, autoScroll, ...props }, ref) => {
    const autoScrollRef = useConversationViewportAutoScroll({ autoScroll });
    const composedRef = useComposedRefs(ref, autoScrollRef);
    const mergedStyle: CSSProperties = {
      scrollbarGutter: 'stable',
      overflowAnchor: 'none',
      ...(props.style ?? {}),
    };

    return (
      <div
        {...props}
        ref={composedRef}
        data-slot="conversation-viewport"
        style={mergedStyle}
        className={cn(
          'relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-auto',
          className
        )}
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
