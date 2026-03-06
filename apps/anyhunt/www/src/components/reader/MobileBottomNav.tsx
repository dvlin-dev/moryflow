/**
 * [PROPS]: activeTabId
 * [EMITS]: none
 * [POS]: Mobile bottom navigation for Reader (Notion-style)
 */

import { Link } from '@tanstack/react-router';
import { Inbox, Compass, Layers } from 'lucide-react';
import { cn } from '@moryflow/ui';
import { MOBILE_TAB_ITEMS, type MobileTabId } from '@/features/reader-shell/mobile-reader-state';

interface MobileBottomNavProps {
  activeTabId: MobileTabId | null;
}

const tabIcons = {
  inbox: Inbox,
  explore: Compass,
  subscriptions: Layers,
} as const;

export function MobileBottomNav({ activeTabId }: MobileBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-around gap-1 px-2 pb-[env(safe-area-inset-bottom)]">
        {MOBILE_TAB_ITEMS.map((item) => {
          const isActive = activeTabId === item.id;
          const Icon = tabIcons[item.id];

          return (
            <Link
              key={item.id}
              to={item.to}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn('size-5', isActive ? 'text-foreground' : 'text-muted-foreground')}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
