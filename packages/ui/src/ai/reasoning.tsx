/**
 * [PROPS]: ReasoningProps/ReasoningTriggerProps/ReasoningContentProps
 * [POS]: Reasoning（thinking）渲染：支持流式 duration、折叠与 Markdown 展示（Streamdown）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import { ChevronDown } from 'lucide-react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Collapsible, CollapsibleTrigger } from '../components/collapsible';
import { AnimatedCollapse } from '../animate/primitives/base/animated-collapse';
import { cn } from '../lib/utils';
import type { ComponentProps } from 'react';
import { createContext, memo, useContext, useEffect, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';
import { Shimmer } from './shimmer';
import { STREAMDOWN_ANIM_STREAMING_OPTIONS } from './streamdown-anim';
import { useConversationViewportController } from './conversation-viewport';

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number | undefined;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error('Reasoning components must be used within Reasoning');
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
  thinkingLabel?: string;
  thoughtLabel?: string;
};

const MS_IN_S = 1000;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = true,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const [duration, setDuration] = useControllableState({
      prop: durationProp,
      defaultProp: undefined,
    });

    const [startTime, setStartTime] = useState<number | null>(null);
    const previousStreaming = useRef(isStreaming);
    const hasManualExpanded = useRef(false);

    // Track duration when streaming starts and ends
    useEffect(() => {
      if (isStreaming) {
        if (startTime === null) {
          setStartTime(Date.now());
        }
      } else if (startTime !== null) {
        setDuration(Math.ceil((Date.now() - startTime) / MS_IN_S));
        setStartTime(null);
      }
    }, [isStreaming, startTime, setDuration]);

    // Streaming 进入时展开；结束后自动折叠（用户手动展开后不再自动折叠）
    useEffect(() => {
      const wasStreaming = previousStreaming.current;

      if (isStreaming && !wasStreaming) {
        setIsOpen(true);
      } else if (!isStreaming && wasStreaming && isOpen && !hasManualExpanded.current) {
        setIsOpen(false);
      }

      previousStreaming.current = isStreaming;
    }, [isOpen, isStreaming, setIsOpen]);

    const handleOpenChange = (newOpen: boolean) => {
      if (newOpen) {
        hasManualExpanded.current = true;
      }
      setIsOpen(newOpen);
    };

    return (
      <ReasoningContext.Provider value={{ isStreaming, isOpen, setIsOpen, duration }}>
        <Collapsible
          className={cn('not-prose mb-4', className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  thinkingLabel?: string;
  thoughtLabel?: string;
  viewportAnchorId?: string;
};

const getThinkingMessage = (
  isStreaming: boolean,
  _duration?: number,
  thinkingLabel = 'Thinking',
  thoughtLabel = 'Thinking'
) => {
  if (isStreaming) {
    return <Shimmer duration={1}>{thinkingLabel}</Shimmer>;
  }
  return <p>{thoughtLabel}</p>;
};

export const ReasoningTrigger = memo(
  ({
    className,
    children,
    thinkingLabel,
    thoughtLabel,
    viewportAnchorId,
    onClick,
    ...props
  }: ReasoningTriggerProps) => {
    const { isStreaming, duration } = useReasoning();
    const { preserveAnchor } = useConversationViewportController();

    return (
      <CollapsibleTrigger
        data-ai-anchor={viewportAnchorId}
        className={cn(
          'group flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors duration-fast hover:text-foreground',
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
        {children ?? (
          <>
            {getThinkingMessage(isStreaming, duration, thinkingLabel, thoughtLabel)}
            <ChevronDown
              className={cn(
                'size-4 transition-transform duration-fast',
                'group-data-[state=closed]:-rotate-90 group-data-[state=open]:rotate-0'
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = {
  children: string;
  className?: string;
};

export const ReasoningContent = memo(({ className, children }: ReasoningContentProps) => {
  const { isStreaming, isOpen } = useReasoning();

  return (
    <AnimatedCollapse open={isOpen}>
      <div className={cn('mt-4 text-sm text-muted-foreground', className)}>
        {/* STREAMDOWN_ANIM: Reasoning 内容在 streaming 时启用 token 动画（animated + isAnimating）。 */}
        <Streamdown animated={STREAMDOWN_ANIM_STREAMING_OPTIONS} isAnimating={isStreaming}>
          {children}
        </Streamdown>
      </div>
    </AnimatedCollapse>
  );
});

Reasoning.displayName = 'Reasoning';
ReasoningTrigger.displayName = 'ReasoningTrigger';
ReasoningContent.displayName = 'ReasoningContent';
