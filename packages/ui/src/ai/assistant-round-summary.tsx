/**
 * [PROPS]: AssistantRoundSummaryProps - AI 轮次摘要触发器参数
 * [EMITS]: onClick/onKeyDown（按钮交互）
 * [POS]: 消息列表层“过程折叠摘要”触发器（不承担消息内容渲染）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import type { ComponentProps } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '../lib/utils';
import { useConversationViewportController } from './conversation-viewport';

export type AssistantRoundSummaryProps = Omit<ComponentProps<'button'>, 'children'> & {
  label: string;
  open: boolean;
  viewportAnchorId?: string;
};

export const AssistantRoundSummary = ({
  label,
  open,
  viewportAnchorId,
  className,
  type = 'button',
  onClick,
  ...props
}: AssistantRoundSummaryProps) => {
  const { preserveAnchor } = useConversationViewportController();

  return (
    <button
      type={type}
      data-ai-anchor={viewportAnchorId}
      className={cn(
        'group flex w-full items-center gap-2 text-muted-foreground text-xs transition-colors duration-fast hover:text-foreground',
        className
      )}
      onClick={(event) => {
        if (viewportAnchorId) {
          preserveAnchor(viewportAnchorId);
        }
        onClick?.(event);
      }}
      {...props}
    >
      <span className="h-px flex-1 bg-border-muted/70" />
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <span>{label}</span>
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform duration-fast',
            open ? 'rotate-0' : '-rotate-90'
          )}
        />
      </span>
      <span className="h-px flex-1 bg-border-muted/70" />
    </button>
  );
};
