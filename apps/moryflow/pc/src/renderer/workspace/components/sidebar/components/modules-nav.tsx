/**
 * [PROPS]: ModulesNavProps
 * [EMITS]: onCreateThread(), onGo(destination), onSearch()
 * [POS]: Sidebar 顶部 Modules 导航（非 Agent 模块入口）：竖排 icon + text
 *
 * [UPDATE]: 2026-02-10 - 修复 label 截断：按钮与文本允许 shrink，超出显示省略号（min-w-0 + truncate）
 * [UPDATE]: 2026-02-11 - 交互减重：移除 hover 背景，仅保留 icon/text 颜色加深反馈
 * [UPDATE]: 2026-02-11 - Search 入口并入 Modules 列表首项，统一 icon+label 视觉层级
 * [UPDATE]: 2026-02-11 - 横向间距收敛：由容器统一 gutter，列表项移除额外左右 padding
 * [UPDATE]: 2026-02-11 - 新增顶部快捷项 New thread，行为与 Threads 区创建动作一致
 * [UPDATE]: 2026-02-11 - 列表项水平内边距进一步收敛到 0，仅使用父容器 gutter 作为横向基线
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Globe, Boxes, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Destination } from '@/workspace/navigation/state';

type ModulesNavProps = {
  onCreateThread: () => void;
  destination: Destination;
  onGo: (destination: Destination) => void;
  onSearch: () => void;
};

const modules: { destination: Destination; label: string; icon: typeof Globe }[] = [
  { destination: 'skills', label: 'Skills', icon: Boxes },
  { destination: 'sites', label: 'Sites', icon: Globe },
];

export const ModulesNav = ({ onCreateThread, destination, onGo, onSearch }: ModulesNavProps) => {
  const itemClassName = cn(
    'flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 text-left text-sm',
    'transition-colors',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50'
  );

  return (
    <nav aria-label="Modules" className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onCreateThread}
        className={cn(itemClassName, 'text-muted-foreground hover:text-foreground')}
        aria-label="New thread"
      >
        <Plus className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">New thread</span>
      </button>

      <button
        type="button"
        onClick={onSearch}
        className={cn(itemClassName, 'text-muted-foreground hover:text-foreground')}
        aria-label="Search"
      >
        <Search className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">Search</span>
      </button>

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
