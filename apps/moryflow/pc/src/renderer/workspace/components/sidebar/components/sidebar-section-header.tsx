/**
 * [PROPS]: SidebarSectionHeaderProps
 * [EMITS]: onAdd
 * [POS]: Sidebar 内容区标题行（Section title + actions；搜索入口统一放在顶部 Workspace 行）
 */

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarSectionHeaderProps = {
  title: string;
  onAdd?: () => void;
  addControl?: React.ReactNode;
  addLabel?: string;
};

export const SidebarSectionHeader = ({
  title,
  onAdd,
  addControl,
  addLabel = 'New',
}: SidebarSectionHeaderProps) => {
  return (
    <div className="flex shrink-0 items-center justify-between px-2.5 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
      </div>
      <div className="flex items-center gap-1">
        {addControl ? (
          addControl
        ) : onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              'rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground'
            )}
            aria-label={addLabel}
          >
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
};
