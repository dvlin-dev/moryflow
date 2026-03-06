/**
 * [PROPS]: ScrollAreaProps - Radix ScrollArea.Root props
 * [EMITS]: -
 * [POS]: Radix ScrollArea 统一封装（用于 Sidebar/Dialogs/工具输出等）
 *
 * [UPDATE]: 2026-02-10 - 修复可拖拽侧栏内列表截断：强制 Viewport 内容容器为 block + w-full，避免 Radix 默认 display:table 造成宽度按内容扩张，导致省略号不生效
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

import { cn } from '../lib/utils';

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-hidden focus-visible:ring-[3px] focus-visible:outline-1 [&>div]:!block [&>div]:h-full [&>div]:min-w-0 [&>div]:w-full"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none p-px transition-colors select-none',
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
