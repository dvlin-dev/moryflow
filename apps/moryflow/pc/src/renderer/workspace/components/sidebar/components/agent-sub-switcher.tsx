/**
 * [PROPS]: AgentSubSwitcherProps
 * [EMITS]: onChange(sub)
 * [POS]: Agent 面板二级入口 segmented（Chat / Workspace），复用现有 pill 视觉；destination!=agent 时选中态略变浅
 * [UPDATE]: 2026-02-10 - 补齐 tablist 语义：tab/tabpanel + keyboard navigation（Arrow/Home/End）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { LucideIcon } from 'lucide-react';
import { MessageSquareText, Folder } from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { AgentSub, Destination } from '@/workspace/navigation/state';

const subs: { value: AgentSub; label: string; icon: LucideIcon }[] = [
  { value: 'chat', label: 'Chat', icon: MessageSquareText },
  { value: 'workspace', label: 'Workspace', icon: Folder },
];

const tabId = (sub: AgentSub) => `agent-sub-tab-${sub}`;
const panelId = (sub: AgentSub) => `agent-sub-panel-${sub}`;

type AgentSubSwitcherProps = {
  destination: Destination;
  agentSub: AgentSub;
  onChange: (sub: AgentSub) => void;
};

export const AgentSubSwitcher = ({ destination, agentSub, onChange }: AgentSubSwitcherProps) => {
  const activeIndex = Math.max(
    0,
    subs.findIndex((item) => item.value === agentSub)
  );
  const isHistory = destination !== 'agent';

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const key = event.key;
      if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
        return;
      }

      event.preventDefault();

      const currentIndex = Math.max(
        0,
        subs.findIndex((item) => item.value === agentSub)
      );
      const lastIndex = subs.length - 1;

      const nextIndex =
        key === 'Home'
          ? 0
          : key === 'End'
            ? lastIndex
            : key === 'ArrowLeft'
              ? (currentIndex - 1 + subs.length) % subs.length
              : (currentIndex + 1) % subs.length;

      const next = subs[nextIndex]?.value ?? 'chat';
      onChange(next);

      const nextEl = document.getElementById(tabId(next));
      if (nextEl instanceof HTMLElement) {
        nextEl.focus();
      }
    },
    [agentSub, onChange]
  );

  return (
    <div
      role="tablist"
      aria-label="Agent view"
      onKeyDown={handleKeyDown}
      className={cn(
        'relative mx-0 flex h-9 w-full shrink-0 items-center rounded-full p-[2px]',
        'bg-secondary'
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute bottom-[2px] left-[2px] top-[2px] rounded-full',
          'border border-border/30 bg-card',
          'shadow-[0_1px_2px_-1px_rgba(0,0,0,0.35)] dark:shadow-[0_1px_2px_-1px_rgba(0,0,0,0.65)]',
          'transition-transform duration-200 ease-in-out',
          isHistory && 'opacity-70'
        )}
        style={{
          width: `calc((100% - 4px) / ${subs.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />

      {subs.map(({ value, label, icon: Icon }) => {
        const active = agentSub === value;
        return (
          <button
            key={value}
            id={tabId(value)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId(value)}
            aria-label={label}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(value)}
            className={cn(
              'relative z-10 flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3',
              'transition-colors duration-200',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50',
              active
                ? isHistory
                  ? 'text-foreground/70'
                  : 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
};
