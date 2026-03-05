/**
 * [PROPS]: AssistantRoundSummaryProps - AI 轮次摘要触发器参数
 * [EMITS]: onClick/onKeyDown（按钮交互）
 * [POS]: 消息列表层“过程折叠摘要”触发器（不承担消息内容渲染）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { ComponentProps } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '../lib/utils';

export type AssistantRoundSummaryProps = Omit<ComponentProps<'button'>, 'children'> & {
  label: string;
  open: boolean;
};

export const AssistantRoundSummary = ({
  label,
  open,
  className,
  type = 'button',
  ...props
}: AssistantRoundSummaryProps) => {
  return (
    <button
      type={type}
      className={cn(
        'group flex w-full items-center gap-2 text-muted-foreground text-xs transition-colors duration-fast hover:text-foreground',
        className
      )}
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
