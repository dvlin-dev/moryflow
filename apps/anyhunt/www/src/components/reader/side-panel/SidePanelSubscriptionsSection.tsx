/**
 * [PROPS]: subscriptions, isLoading, onCreateSubscription, onOpenSubscriptionSettings
 * [POS]: SidePanel - Subscriptions list (authed, Lucide icons direct render)
 * [UPDATE]: 2026-01-28 支持可选 header 以复用到移动端订阅页
 */

import { Link } from '@tanstack/react-router';
import { Button, cn } from '@moryflow/ui';
import { Plus, Settings } from 'lucide-react';
import type { Subscription } from '@/features/digest/types';

interface SidePanelSubscriptionsSectionProps {
  pathname: string;
  subscriptions: Subscription[];
  isLoading: boolean;
  onCreateSubscription: () => void;
  onOpenSubscriptionSettings: (subscription: Subscription) => void;
  showHeader?: boolean;
}

export function SidePanelSubscriptionsSection({
  pathname,
  subscriptions,
  isLoading,
  onCreateSubscription,
  onOpenSubscriptionSettings,
  showHeader = true,
}: SidePanelSubscriptionsSectionProps) {
  const isInboxActive = pathname.startsWith('/inbox');

  return (
    <div className="space-y-2">
      {showHeader ? (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-medium text-muted-foreground">Subscriptions</div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onCreateSubscription}
          >
            <Plus className="size-4" />
            <span className="sr-only">New subscription</span>
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="px-2 py-2 text-xs text-muted-foreground">Loading…</div>
      ) : subscriptions.length === 0 ? (
        <div className="px-2 py-2 text-xs text-muted-foreground">
          No subscriptions yet. Create one to start.
        </div>
      ) : (
        <div className="space-y-1">
          <Link
            to="/inbox"
            className={cn(
              'flex w-full items-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
              isInboxActive
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent/60'
            )}
          >
            All
          </Link>

          {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-accent/60"
            >
              <Link
                to="/inbox"
                search={{ subscriptionId: subscription.id }}
                className="flex flex-1 items-center rounded-md px-1 py-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <span className="truncate">{subscription.name}</span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => onOpenSubscriptionSettings(subscription)}
              >
                <Settings className="size-4" />
                <span className="sr-only">Subscription settings</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
