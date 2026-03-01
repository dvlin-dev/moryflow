/**
 * [PROPS]: ReasoningProps/ReasoningTriggerProps/ReasoningContentProps
 * [POS]: Reasoning（thinking）渲染：支持流式 duration、折叠与 Markdown 展示（Streamdown）
 * [UPDATE]: 2026-03-02 - streaming 状态迁移自动开合规则收敛，手动展开优先级提升
 * [UPDATE]: 2026-02-10 - Streamdown v2.2：ReasoningContent 在 streaming 时启用逐词流式动画
 * [UPDATE]: 2026-02-10 - STREAMDOWN_ANIM 标记：ReasoningContent 动画触发点
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { Brain, ChevronDown } from 'lucide-react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/collapsible';
import { cn } from '../lib/utils';
import type { ComponentProps } from 'react';
import { createContext, memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';
import { Shimmer } from './shimmer';
import { STREAMDOWN_ANIM_STREAMING_OPTIONS } from './streamdown-anim';

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

const AUTO_CLOSE_DELAY = 1000;
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
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearCloseTimer = useCallback(() => {
      if (!closeTimerRef.current) {
        return;
      }
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }, []);

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
        clearCloseTimer();
        setIsOpen(true);
      } else if (!isStreaming && wasStreaming && isOpen && !hasManualExpanded.current) {
        clearCloseTimer();
        closeTimerRef.current = setTimeout(() => {
          setIsOpen(false);
          closeTimerRef.current = null;
        }, AUTO_CLOSE_DELAY);
      }

      previousStreaming.current = isStreaming;
    }, [clearCloseTimer, isOpen, isStreaming, setIsOpen]);

    useEffect(() => {
      return () => clearCloseTimer();
    }, [clearCloseTimer]);

    const handleOpenChange = (newOpen: boolean) => {
      if (newOpen) {
        hasManualExpanded.current = true;
        clearCloseTimer();
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
};

const getThinkingMessage = (
  isStreaming: boolean,
  _duration?: number,
  thinkingLabel = 'Thinking...',
  thoughtLabel = 'Thought process'
) => {
  if (isStreaming) {
    return <Shimmer duration={1}>{thinkingLabel}</Shimmer>;
  }
  return <p>{thoughtLabel}</p>;
};

export const ReasoningTrigger = memo(
  ({ className, children, thinkingLabel, thoughtLabel, ...props }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning();

    return (
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors duration-fast hover:text-foreground',
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <Brain className="size-4" />
            {getThinkingMessage(isStreaming, duration, thinkingLabel, thoughtLabel)}
            <ChevronDown
              className={cn(
                'size-4 transition-transform duration-fast',
                isOpen ? 'rotate-180' : 'rotate-0'
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
  children: string;
};

export const ReasoningContent = memo(({ className, children, ...props }: ReasoningContentProps) => {
  const { isStreaming } = useReasoning();

  return (
    <CollapsibleContent
      className={cn(
        'mt-4 text-sm',
        'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in',
        className
      )}
      {...props}
    >
      {/* STREAMDOWN_ANIM: Reasoning 内容在 streaming 时启用 token 动画（animated + isAnimating）。 */}
      <Streamdown animated={STREAMDOWN_ANIM_STREAMING_OPTIONS} isAnimating={isStreaming}>
        {children}
      </Streamdown>
    </CollapsibleContent>
  );
});

Reasoning.displayName = 'Reasoning';
ReasoningTrigger.displayName = 'ReasoningTrigger';
ReasoningContent.displayName = 'ReasoningContent';
