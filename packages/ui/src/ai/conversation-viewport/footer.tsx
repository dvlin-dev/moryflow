/**
 * [PROPS]: ConversationViewportFooterProps - 底部区域测量
 * [EMITS]: None
 * [POS]: Conversation Viewport 底部区域高度注册
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { forwardRef, useCallback } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/utils';
import { useConversationViewport } from './context';
import { useSizeHandle } from './use-size-handle';

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
  const sizeRef = useSizeHandle(register, getHeight);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      sizeRef(node);
    },
    [ref, sizeRef]
  );

  return (
    <div {...props} ref={setRef} className={cn('sticky bottom-0 z-10 bg-background', className)} />
  );
});

ConversationViewportFooter.displayName = 'ConversationViewportFooter';
