'use client';

/**
 * [PROPS]: ConversationProps/ConversationContentProps/ConversationScrollButtonProps
 * [EMITS]: None
 * [POS]: 消息列表滚动容器与基础布局组件
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ComponentProps, ComponentPropsWithoutRef, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '../components/button';
import { cn } from '../lib/utils';
import { ConversationViewport, useConversationViewport } from './conversation-viewport';

export type ConversationProps = ComponentPropsWithoutRef<'div'>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <ConversationViewport className={className} role={props.role ?? 'log'} {...props} />
);

export type ConversationContentProps = ComponentPropsWithoutRef<'div'>;

export const ConversationContent = ({ className, ...props }: ConversationContentProps) => (
  <div
    data-slot="conversation-content"
    className={cn('flex h-full flex-col gap-1 p-4', className)}
    {...props}
  />
);

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
      'flex size-full flex-col items-center justify-center gap-3 p-8 text-center',
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

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const isAtBottom = useConversationViewport((state) => state.isAtBottom);
  const scrollToBottom = useConversationViewport((state) => state.scrollToBottom);

  return (
    !isAtBottom && (
      <Button
        className={cn('absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full', className)}
        onClick={() => scrollToBottom({ behavior: 'auto' })}
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
