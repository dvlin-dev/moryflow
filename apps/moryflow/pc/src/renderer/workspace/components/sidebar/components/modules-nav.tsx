/**
 * [PROPS]: ModulesNavProps
 * [EMITS]: onGo(destination)
 * [POS]: Sidebar 顶部 Modules 导航（非 Agent 模块入口）：竖排 icon + text
 *
 * [UPDATE]: 2026-02-10 - 修复 label 截断：按钮与文本允许 shrink，超出显示省略号（min-w-0 + truncate）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Destination } from '@/workspace/navigation/state';

type ModulesNavProps = {
  destination: Destination;
  onGo: (destination: Destination) => void;
};

const modules: { destination: Destination; label: string; icon: typeof Globe }[] = [
  { destination: 'sites', label: 'Sites', icon: Globe },
];

export const ModulesNav = ({ destination, onGo }: ModulesNavProps) => {
  return (
    <nav aria-label="Modules" className="flex flex-col gap-1">
      {modules.map(({ destination: dest, label, icon: Icon }) => {
        const active = destination === dest;
        return (
          <button
            key={dest}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onGo(dest)}
            className={cn(
              'flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
              'transition-colors',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50',
              active
                ? 'bg-accent/60 text-foreground'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground/80'
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
