'use client';

/**
 * [PROPS]: ConversationProps/ConversationContentProps/ConversationScrollButtonProps
 * [EMITS]: None
 * [POS]: 消息列表滚动容器与基础布局组件
 * [UPDATE]: 2026-02-03 - 调整内容/空态高度，保证 Footer 始终可见
 * [UPDATE]: 2026-02-04 - 移除顶部 inset 与 overflow-anchor，严格对齐 assistant-ui
 * [UPDATE]: 2026-02-04 - ConversationContent 顶部 padding 使用 header 变量，避免首条消息被覆盖
 * [UPDATE]: 2026-02-05 - 顶部 padding 额外预留改为可配置变量，默认 1rem
 * [UPDATE]: 2026-02-07 - ConversationContent gap/padding-bottom 改为 CSS 变量单一数据源（TurnTail slack 计算不再依赖 computedStyle race）
 * [UPDATE]: 2026-02-05 - ScrollButton 回退 assistant-ui 行为，仅依赖 isAtBottom
 * [UPDATE]: 2026-02-05 - ScrollButton 基于距离阈值控制显示（默认 200px）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ComponentProps, ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '../components/button';
import { cn } from '../lib/utils';
import type { ConversationViewportProps } from './conversation-viewport';
import {
  ConversationViewport,
  useConversationViewport,
  useConversationViewportStore,
} from './conversation-viewport';

export type ConversationProps = ConversationViewportProps;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <ConversationViewport className={className} role={props.role ?? 'log'} {...props} />
);

export type ConversationContentProps = ComponentPropsWithoutRef<'div'>;

const DEFAULT_CONVERSATION_CONTENT_GAP_PX = '4px';
const DEFAULT_CONVERSATION_CONTENT_PADDING_BOTTOM_PX = '16px';

const CONVERSATION_CONTENT_GAP_VAR = '--ai-conversation-content-gap';
const CONVERSATION_CONTENT_PADDING_BOTTOM_VAR = '--ai-conversation-content-padding-bottom';

export const ConversationContent = ({ className, style, ...props }: ConversationContentProps) => {
  const paddingTop =
    style?.paddingTop ??
    'calc(var(--ai-conversation-top-padding, 0px) + var(--ai-conversation-top-padding-extra, 1rem))';

  const styleRecord = style as Record<string, unknown> | undefined;
  const contentGap =
    (styleRecord?.[CONVERSATION_CONTENT_GAP_VAR] as string | undefined) ??
    DEFAULT_CONVERSATION_CONTENT_GAP_PX;
  const contentPaddingBottom =
    (styleRecord?.[CONVERSATION_CONTENT_PADDING_BOTTOM_VAR] as string | undefined) ??
    DEFAULT_CONVERSATION_CONTENT_PADDING_BOTTOM_PX;

  // TurnAnchor=top 的 Slack/min-height 计算需要用到 ConversationContent 的 gap/padding-bottom。
  // 这些值若靠 computedStyle 读取（尤其是 Tailwind spacing），在渲染初期可能出现短暂的 0/未计算状态，
  // 进而导致“固定 20px 回弹/闪烁”。因此这里改为 CSS 变量单一数据源：
  // - 视觉布局由变量驱动
  // - TurnTail slack 计算只读变量
  const mergedStyle = {
    ...style,
    [CONVERSATION_CONTENT_GAP_VAR]: contentGap,
    [CONVERSATION_CONTENT_PADDING_BOTTOM_VAR]: contentPaddingBottom,
    paddingTop,
    gap: `var(${CONVERSATION_CONTENT_GAP_VAR})`,
    paddingBottom: `var(${CONVERSATION_CONTENT_PADDING_BOTTOM_VAR})`,
  } as CSSProperties;

  return (
    <div
      data-slot="conversation-content"
      className={cn('flex flex-col px-4', className)}
      style={mergedStyle}
      {...props}
    />
  );
};

export type ConversationEmptyStateProps = ComponentProps<'div'> & {
  title?: string;
  description?: string;
  icon?: ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = 'No messages yet',
  description = 'Start a conversation to see messages here',
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      'flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center',
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button> & {
  distanceThreshold?: number;
};

export const ConversationScrollButton = ({
  className,
  distanceThreshold = 200,
  ...props
}: ConversationScrollButtonProps) => {
  const distanceFromBottom = useConversationViewport((state) => state.distanceFromBottom);
  const viewportStore = useConversationViewportStore();
  const shouldShow = distanceFromBottom > distanceThreshold;

  return (
    shouldShow && (
      <Button
        className={cn('absolute -top-12 left-[50%] translate-x-[-50%] rounded-full', className)}
        onClick={() => viewportStore.getState().scrollToBottom({ behavior: 'auto' })}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ChevronDown className="size-4" />
      </Button>
    )
  );
};
