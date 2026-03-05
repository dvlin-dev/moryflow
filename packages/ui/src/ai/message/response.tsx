/**
 * [PROPS]: MessageResponseProps - 消息正文渲染
 * [POS]: 使用 Streamdown 渲染富文本消息（保留样式更新）
 * [UPDATE]: 2026-03-05 - 注入自定义表格组件：直接复制 Markdown 格式，无二级菜单
 * [UPDATE]: 2026-02-10 - STREAMDOWN_ANIM 标记：Streamdown 渲染入口（animated/isAnimating 由上层控制）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
