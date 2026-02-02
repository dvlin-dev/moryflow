/**
 * [PROPS]: ConversationViewportSlackProps - Slack 计算配置
 * [EMITS]: None
 * [POS]: Conversation Viewport Slack 补位容器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/utils';
import { useConversationViewport } from './context';

type ConversationViewportSlackProps = ComponentPropsWithoutRef<'div'> & {
  enabled?: boolean;
  clampThreshold?: number;
  clampOffset?: number;
};

const DEFAULT_THRESHOLD = 160;
const DEFAULT_OFFSET = 96;

export const ConversationViewportSlack = ({
  enabled = true,
  clampThreshold = DEFAULT_THRESHOLD,
  clampOffset = DEFAULT_OFFSET,
  className,
  style,
  ...props
}: ConversationViewportSlackProps) => {
  const { viewport, inset, userMessage } = useConversationViewport((state) => state.height);

  const shouldApply = enabled && viewport > 0 && userMessage > 0;
  const clampAdjustment = userMessage <= clampThreshold ? userMessage : clampOffset;
  const minHeight = shouldApply ? Math.max(0, viewport - inset - clampAdjustment) : undefined;

  return (
    <div
      {...props}
      className={cn(className)}
      style={{
        ...style,
        minHeight: minHeight !== undefined ? `${minHeight}px` : undefined,
        flexShrink: minHeight !== undefined ? 0 : undefined,
      }}
    />
  );
};

ConversationViewportSlack.displayName = 'ConversationViewportSlack';
