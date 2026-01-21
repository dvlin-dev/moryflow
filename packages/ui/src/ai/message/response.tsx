/**
 * [PROPS]: MessageResponseProps - 消息正文渲染
 * [POS]: 使用 Streamdown 渲染富文本消息（保留样式更新）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { memo } from 'react';

import { Streamdown } from 'streamdown';

import { cn } from '../../lib/utils';

import type { MessageResponseProps } from './const';

export const MessageResponse = memo(({ className, ...props }: MessageResponseProps) => (
  <Streamdown
    className={cn('size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}
    {...props}
  />
));

MessageResponse.displayName = 'MessageResponse';
