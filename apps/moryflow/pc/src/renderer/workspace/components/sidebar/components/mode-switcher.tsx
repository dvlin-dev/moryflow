/**
 * [PROPS]: ModeSwitcherProps
 * [EMITS]: onModeChange(mode)
 * [POS]: Left Sidebar Mode Switcher（Chat / Workspace / Sites）
 */

import type { LucideIcon } from 'lucide-react';
import { MessageSquareText, Folder, Globe } from 'lucide-react';
import type { AppMode } from '@/workspace/hooks/use-app-mode';
import { cn } from '@/lib/utils';

const modes: { value: AppMode; label: string; icon: LucideIcon }[] = [
  { value: 'chat', label: 'Chat', icon: MessageSquareText },
  { value: 'workspace', label: 'Workspace', icon: Folder },
  { value: 'sites', label: 'Sites', icon: Globe },
];

type ModeSwitcherProps = {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
};

export const ModeSwitcher = ({ mode, onModeChange }: ModeSwitcherProps) => {
  const activeIndex = Math.max(
    0,
    modes.findIndex((item) => item.value === mode)
  );

  return (
    <div
      role="tablist"
      className={cn(
        // Segmented pill: subtle container + floating selection capsule, full-width adaptive.
        'relative mx-0 flex h-9 w-full shrink-0 items-center rounded-full p-[2px]',
        'bg-secondary'
      )}
    >
      {/* Selection indicator (moves smoothly; keeps buttons background-free). */}
      <div
        aria-hidden="true"
        className={cn(
          // Keep a visible gap to the container edge and avoid shadow bleeding into that gap.
          'pointer-events-none absolute bottom-[2px] left-[2px] top-[2px] rounded-full',
          'border border-border/30 bg-card',
          'shadow-[0_1px_2px_-1px_rgba(0,0,0,0.35)] dark:shadow-[0_1px_2px_-1px_rgba(0,0,0,0.65)]',
          'transition-transform duration-200 ease-in-out'
        )}
        style={{
          width: `calc((100% - 4px) / ${modes.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />

      {modes.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            onClick={() => onModeChange(value)}
            className={cn(
              'relative z-10 flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3',
              'transition-colors duration-200',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
};
