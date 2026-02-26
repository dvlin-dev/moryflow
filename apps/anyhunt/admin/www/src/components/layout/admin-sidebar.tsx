/**
 * [PROPS]: pathname / sidebarOpen / openGroups / onOpenGroupChange / onCloseSidebar
 * [EMITS]: navigate / toggleGroup / closeSidebar
 * [POS]: Admin 侧边导航
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { Link } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@moryflow/ui';
import { cn } from '@moryflow/ui/lib';
import { ADMIN_NAV_GROUPS, isPathActive } from '@/app/admin-routes';

export interface AdminSidebarProps {
  pathname: string;
  sidebarOpen: boolean;
  openGroups: Record<string, boolean>;
  onOpenGroupChange: (groupId: string, next: boolean) => void;
  onCloseSidebar: () => void;
}

export function AdminSidebar({
  pathname,
  sidebarOpen,
  openGroups,
  onOpenGroupChange,
  onCloseSidebar,
}: AdminSidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-sidebar transition-transform lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <span className="text-lg font-bold">Anyhunt Admin</span>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseSidebar}
          className="lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="p-4">
        <ul className="space-y-1">
          {ADMIN_NAV_GROUPS.map((group) => {
            const groupActive = group.items.some((item) => isPathActive(pathname, item.path));
            const open = openGroups[group.id] ?? false;
            const GroupIcon = group.icon;

            return (
              <li key={group.id} className="pt-1">
                <Collapsible open={open} onOpenChange={(next) => onOpenGroupChange(group.id, next)}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                        groupActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                      type="button"
                      aria-label={`Toggle ${group.label}`}
                    >
                      <span className="flex items-center gap-3">
                        <GroupIcon className="h-4 w-4" />
                        {group.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          open ? 'rotate-0' : '-rotate-90'
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <ul className="mt-1 space-y-1 pl-3">
                      {group.items.map((item) => {
                        const active = isPathActive(pathname, item.path);
                        const ItemIcon = item.icon;

                        return (
                          <li key={item.path}>
                            <Link
                              to={item.path}
                              onClick={onCloseSidebar}
                              className={cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                                active
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                              )}
                            >
                              <ItemIcon className="h-4 w-4 opacity-80" />
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
