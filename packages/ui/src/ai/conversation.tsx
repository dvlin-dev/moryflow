'use client';

/**
 * [PROPS]: ConversationProps/ConversationContentProps/ConversationScrollButtonProps
 * [EMITS]: None
 * [POS]: 消息列表滚动容器与基础布局组件
 * [UPDATE]: 2026-02-03 - 调整内容/空态高度，保证 Footer 始终可见
 * [UPDATE]: 2026-02-04 - 移除顶部 inset 与 overflow-anchor，避免滚动锚定导致闪烁
 * [UPDATE]: 2026-02-04 - ConversationContent 顶部 padding 使用 header 变量，避免首条消息被覆盖
 * [UPDATE]: 2026-02-05 - 顶部 padding 额外预留改为可配置变量，默认 1rem
 * [UPDATE]: 2026-02-07 - ConversationContent：移除 TurnAnchor=top 相关 CSS vars，回归静态 gap/pb（更简单）
 * [UPDATE]: 2026-02-05 - ScrollButton：仅依赖 distanceFromBottom 阈值 + scrollToBottom
 * [UPDATE]: 2026-02-05 - ScrollButton 基于距离阈值控制显示（默认 200px）
 * [UPDATE]: 2026-02-07 - 回归经典 chat：滚动动画由 scrollTo({behavior:'smooth'}) 显式控制
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

export const ConversationContent = ({ className, style, ...props }: ConversationContentProps) => {
  const paddingTop =
    style?.paddingTop ??
    'calc(var(--ai-conversation-top-padding, 0px) + var(--ai-conversation-top-padding-extra, 1rem))';

  const mergedStyle = { ...style, paddingTop } as CSSProperties;

  return (
    <div
      data-slot="conversation-content"
      className={cn('flex flex-col gap-1 px-4 pb-4', className)}
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
        onClick={() => viewportStore.getState().scrollToBottom({ behavior: 'smooth' })}
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
