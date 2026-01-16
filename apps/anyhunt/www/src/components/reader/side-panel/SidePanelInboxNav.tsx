/**
 * [PROPS]: stats, currentView, onViewChange
 * [POS]: SidePanel Inbox 导航（All/Saved/Subscriptions）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { Badge, Icon } from '@anyhunt/ui';
import { InboxIcon, StarIcon } from '@hugeicons/core-free-icons';
import type { InboxStats } from '@/features/digest/types';
import type { SidePanelView } from './side-panel.types';

interface SidePanelInboxNavProps {
  stats: InboxStats | null;
  currentView: SidePanelView;
  onViewChange: (view: SidePanelView) => void;
}

function isInboxViewSelected(currentView: SidePanelView, filter: 'all' | 'saved'): boolean {
  return currentView.type === 'inbox' && currentView.filter === filter;
}

export function SidePanelInboxNav({ stats, currentView, onViewChange }: SidePanelInboxNavProps) {
  return (
    <div className="space-y-0.5 p-2">
      <div className="px-2 py-1">
        <span className="text-xs font-medium uppercase text-muted-foreground">Inbox</span>
      </div>
      <button
        type="button"
        onClick={() => onViewChange({ type: 'inbox', filter: 'all' })}
        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          isInboxViewSelected(currentView, 'all')
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon icon={InboxIcon} className="size-4" />
          <span>All</span>
        </div>
        {stats && stats.unreadCount > 0 && (
          <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
            {stats.unreadCount}
          </Badge>
        )}
      </button>
      <button
        type="button"
        onClick={() => onViewChange({ type: 'inbox', filter: 'saved' })}
        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          isInboxViewSelected(currentView, 'saved')
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon icon={StarIcon} className="size-4" />
          <span>Saved</span>
        </div>
        {stats && stats.savedCount > 0 && (
          <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
            {stats.savedCount}
          </Badge>
        )}
      </button>
    </div>
  );
}
