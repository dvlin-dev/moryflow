/**
 * [PROPS]: ModulesNavProps
 * [EMITS]: onGo(destination)
 * [POS]: Sidebar Home 模式下的 Modules 导航（Agent/Skills/Sites）
 *
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Bot, Globe, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Destination, ModuleDestination } from '@/workspace/navigation/state';
import { getModulesRegistryItems } from '@/workspace/navigation/modules-registry';

type ModulesNavProps = {
  destination: Destination;
  onGo: (destination: Destination) => void;
};

const modules = getModulesRegistryItems();
const moduleIconMap: Record<ModuleDestination, typeof Globe> = {
  'agent-module': Bot,
  skills: Boxes,
  sites: Globe,
};

export const ModulesNav = ({ destination, onGo }: ModulesNavProps) => {
  const itemClassName = cn(
    'flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 text-left text-sm',
    'transition-colors',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50'
  );

  return (
    <nav aria-label="Modules" className="flex flex-col gap-1 border-b border-border/40 pb-2">
      {modules.map(({ destination: dest, label }) => {
        const Icon = moduleIconMap[dest];
        const active = destination === dest;
        return (
          <button
            key={dest}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onGo(dest)}
            className={cn(
              itemClassName,
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
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
