/**
 * [PROPS]: ConversationViewportFooterProps - 底部区域容器
 * [EMITS]: None
 * [POS]: Conversation Viewport 底部区域容器（布局 + inset 高度注册）
 * [UPDATE]: 2026-02-07 - 回归经典 chat：移除 inset 高度注册，Footer 只负责 sticky 布局
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/utils';

export type ConversationViewportFooterProps = ComponentPropsWithoutRef<'div'>;

export const ConversationViewportFooter = forwardRef<
  HTMLDivElement,
  ConversationViewportFooterProps
>(({ className, ...props }, ref) => {
  return (
    <div
      {...props}
      ref={ref}
      data-slot="conversation-viewport-footer"
      className={cn('sticky bottom-0 z-10 mt-auto bg-background', className)}
    />
  );
});

ConversationViewportFooter.displayName = 'ConversationViewportFooter';
