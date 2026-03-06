/**
 * [PROPS]: SidebarModeTabsProps
 * [EMITS]: onChange(mode)
 * [POS]: Sidebar Header 左侧模式切换（Home/Chat）
 */

import { useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { SidebarMode } from '@/workspace/navigation/state';

const modes: SidebarMode[] = ['home', 'chat'];

const getTabLabel = (mode: SidebarMode) => (mode === 'home' ? 'Home' : 'Chat');
const getTabId = (mode: SidebarMode) => `sidebar-mode-tab-${mode}`;
const getPanelId = (mode: SidebarMode) => `sidebar-mode-panel-${mode}`;

type SidebarModeTabsProps = {
  mode: SidebarMode;
  onChange: (mode: SidebarMode) => void;
};

export const SidebarModeTabs = ({ mode, onChange }: SidebarModeTabsProps) => {
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const key = event.key;
      if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
        return;
      }

      event.preventDefault();

      const currentIndex = Math.max(
        0,
        modes.findIndex((item) => item === mode)
      );
      const lastIndex = modes.length - 1;
      const nextIndex =
        key === 'Home'
          ? 0
          : key === 'End'
            ? lastIndex
            : key === 'ArrowLeft'
              ? (currentIndex - 1 + modes.length) % modes.length
              : (currentIndex + 1) % modes.length;

      const nextMode = modes[nextIndex] ?? 'home';
      onChange(nextMode);

      const nextEl = document.getElementById(getTabId(nextMode));
      if (nextEl instanceof HTMLElement) {
        nextEl.focus();
      }
    },
    [mode, onChange]
  );

  return (
    <div
      role="tablist"
      aria-label="Sidebar mode"
      onKeyDown={handleKeyDown}
      className="window-no-drag inline-flex items-center gap-1 rounded-md bg-muted/60 p-1"
    >
      {modes.map((item) => {
        const active = mode === item;
        return (
          <button
            key={item}
            id={getTabId(item)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={getPanelId(item)}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item)}
            className={cn(
              'rounded px-2.5 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {getTabLabel(item)}
          </button>
        );
      })}
    </div>
  );
};
