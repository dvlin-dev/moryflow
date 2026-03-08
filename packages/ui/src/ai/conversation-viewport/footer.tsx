/**
 * [PROPS]: ConversationViewportFooterProps - 底部区域容器
 * [EMITS]: None
 * [POS]: Conversation Viewport 底部区域容器（布局 + inset 高度注册）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
      className={cn('relative z-10 shrink-0 bg-background', className)}
    />
  );
});

ConversationViewportFooter.displayName = 'ConversationViewportFooter';
