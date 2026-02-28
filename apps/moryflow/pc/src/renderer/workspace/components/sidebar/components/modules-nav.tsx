/**
 * [PROPS]: ModulesNavProps
 * [EMITS]: onGo(destination)
 * [POS]: Sidebar Home 模式下的 Modules 导航（Skills/Sites）
 *
 * [UPDATE]: 2026-02-10 - 修复 label 截断：按钮与文本允许 shrink，超出显示省略号（min-w-0 + truncate）
 * [UPDATE]: 2026-02-11 - 交互减重：移除 hover 背景，仅保留 icon/text 颜色加深反馈
 * [UPDATE]: 2026-02-28 - 删除 New thread/Search 入口，只保留 Skills/Sites，配合 Home/Chat 顶部 Header 重构
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Globe, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Destination } from '@/workspace/navigation/state';

type ModulesNavProps = {
  destination: Destination;
  onGo: (destination: Destination) => void;
};

const modules: { destination: Destination; label: string; icon: typeof Globe }[] = [
  { destination: 'skills', label: 'Skills', icon: Boxes },
  { destination: 'sites', label: 'Sites', icon: Globe },
];

export const ModulesNav = ({ destination, onGo }: ModulesNavProps) => {
  const itemClassName = cn(
    'flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 text-left text-sm',
    'transition-colors',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50'
  );

  return (
    <nav aria-label="Modules" className="flex flex-col gap-1 border-b border-border/40 pb-2">
      {modules.map(({ destination: dest, label, icon: Icon }) => {
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
