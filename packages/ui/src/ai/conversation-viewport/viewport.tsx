/**
 * [PROPS]: ConversationViewportProps - 滚动容器与 Viewport 配置
 * [EMITS]: None
 * [POS]: Conversation Viewport 滚动容器（bottom-anchor + Following 自动滚动）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { forwardRef, type ReactNode } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';

import { cn } from '../../lib/utils';
import { ConversationViewportProvider } from './context';
import { useConversationViewportAutoScroll } from './use-auto-scroll';

export type ConversationViewportProps = ComponentPropsWithoutRef<'div'> & {
  autoScroll?: boolean;
  footer?: ReactNode;
};

const ConversationViewportInner = forwardRef<HTMLDivElement, ConversationViewportProps>(
  ({ className, autoScroll, footer, children, ...props }, ref) => {
    const autoScrollRef = useConversationViewportAutoScroll({ autoScroll });
    const composedRef = useComposedRefs(ref, autoScrollRef);
    const mergedStyle: CSSProperties = {
      scrollbarGutter: 'stable',
      overflowAnchor: 'none',
      ...(props.style ?? {}),
    };

    return (
      <div
        data-slot="conversation-viewport-root"
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      >
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
        >
          {children}
        </div>
        {footer ?? null}
      </div>
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
