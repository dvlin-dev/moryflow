/**
 * [PROPS]: pathname, stats, isLoading
 * [POS]: SidePanel - Inbox entry (authed)
 */

import { Link } from '@tanstack/react-router';
import { cn } from '@anyhunt/ui';
import type { InboxStats } from '@/features/digest/types';

interface SidePanelInboxSectionProps {
  pathname: string;
  stats: InboxStats | null;
  isLoading: boolean;
}

export function SidePanelInboxSection({ pathname, stats, isLoading }: SidePanelInboxSectionProps) {
  const isActive = pathname.startsWith('/inbox');
  const unreadCount = stats?.unreadCount ?? 0;

  return (
    <div className="space-y-2">
      <Link
        to="/inbox"
        className={cn(
          'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
          isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60'
        )}
      >
        <span>Inbox</span>
        <span className="text-xs text-muted-foreground">
          {isLoading ? '…' : unreadCount > 0 ? unreadCount : ''}
        </span>
      </Link>
    </div>
  );
}
