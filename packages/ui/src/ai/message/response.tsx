/**
 * [PROPS]: MessageResponseProps - 消息正文渲染
 * [POS]: 使用 Streamdown 渲染富文本消息（保留样式更新）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import { memo, useMemo } from 'react';

import { Streamdown } from 'streamdown';

import { cn } from '../../lib/utils';
import { MarkdownTable } from '../markdown-table';

import type { MessageResponseProps } from './const';

export const MessageResponse = memo(({ className, components, ...props }: MessageResponseProps) => {
  const merged = useMemo(
    () => ({ table: MarkdownTable, ...components }) as MessageResponseProps['components'],
    [components]
  );

  return (
    // STREAMDOWN_ANIM: 上层对最后一条 assistant 文本段传入 animated/isAnimating，这里仅做透传。
    <Streamdown
      className={cn('size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}
      components={merged}
      {...props}
    />
  );
});

MessageResponse.displayName = 'MessageResponse';
