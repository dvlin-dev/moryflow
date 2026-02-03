/**
 * [PROPS]: MessageProps/MessageContentProps/MessageActionProps/MessageActionsProps
 * [EMITS]: None
 * [POS]: 消息基础原语（内容布局）
 * [UPDATE]: 2026-02-03 - 移除 Viewport 依赖，保持基础组件可复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { forwardRef } from 'react';

import { Button } from '../../components/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/tooltip';
import { cn } from '../../lib/utils';

import type {
  MessageActionProps,
  MessageActionsProps,
  MessageContentProps,
  MessageProps,
} from './const';

export const Message = forwardRef<HTMLDivElement, MessageProps>(function Message(
  { className, from, ...props },
  ref
) {
  return (
    <div
      className={cn(
        // 避免在纵向 flex 容器中被压缩，保证 min-height 仅作为下限
        'group flex w-full max-w-[80%] flex-col gap-2 h-auto max-h-none shrink-0',
        from === 'user' ? 'is-user ml-auto justify-end' : 'is-assistant',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

export const MessageContent = forwardRef<HTMLDivElement, MessageContentProps>(
  function MessageContent({ children, className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'is-user:dark flex flex-col gap-2 text-sm wrap-break-word',
          'min-w-0',
          'group-[.is-assistant]:w-full group-[.is-assistant]:max-w-full',
          'group-[.is-user]:w-fit group-[.is-user]:max-w-full',
          'group-[.is-user]:ml-auto group-[.is-user]:rounded-xl group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground',
          'group-[.is-assistant]:text-foreground',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export const MessageActions = ({ className, children, ...props }: MessageActionsProps) => (
  <div className={cn('flex items-center gap-1', className)} {...props}>
    {children}
  </div>
);

export const MessageAction = ({
  tooltip,
  children,
  label,
  variant = 'ghost',
  size = 'icon-sm',
  ...props
}: MessageActionProps) => {
  const button = (
    <Button size={size} type="button" variant={variant} {...props}>
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};
