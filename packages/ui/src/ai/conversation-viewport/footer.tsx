/**
 * [PROPS]: ConversationViewportFooterProps - 底部区域容器
 * [EMITS]: None
 * [POS]: Conversation Viewport 底部区域容器（布局 + inset 高度注册）
 * [UPDATE]: 2026-02-05 - 移除自研 inset 测量，保持 assistant-ui 视口纯净
 * [UPDATE]: 2026-02-05 - 采用 assistant-ui ViewportFooter height 注册
 * [UPDATE]: 2026-02-06 - 增加 data-slot，便于 AutoScroll 可视性调试
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { forwardRef, useCallback } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/utils';
import { useSizeHandle } from '../assistant-ui/utils/hooks/useSizeHandle';
import { useConversationViewport } from './context';

export type ConversationViewportFooterProps = ComponentPropsWithoutRef<'div'>;

export const ConversationViewportFooter = forwardRef<
  HTMLDivElement,
  ConversationViewportFooterProps
>(({ className, ...props }, ref) => {
  const register = useConversationViewport((state) => state.registerContentInset);
  const getHeight = useCallback((el: HTMLElement) => {
    const marginTop = parseFloat(getComputedStyle(el).marginTop) || 0;
    return el.offsetHeight + marginTop;
  }, []);
  const resizeRef = useSizeHandle(register, getHeight);
  const composedRef = useComposedRefs(ref, resizeRef);

  return (
    <div
      {...props}
      ref={composedRef}
      data-slot="conversation-viewport-footer"
      className={cn('sticky bottom-0 z-10 mt-auto bg-background', className)}
    />
  );
});

ConversationViewportFooter.displayName = 'ConversationViewportFooter';
