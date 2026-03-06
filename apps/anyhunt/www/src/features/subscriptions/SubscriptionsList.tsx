/**
 * [PROPS]: subscriptions, isLoading
 * [EMITS]: none
 * [POS]: Mobile-first subscription list with action entrypoints
 * [UPDATE]: 2026-01-28 保留 URL search 参数，避免状态丢失
 */

import { useNavigate } from '@tanstack/react-router';
import type { Subscription } from '@/features/digest/types';
import { SubscriptionItem } from '@/components/reader/SubscriptionItem';
import type { SubscriptionAction } from '@/components/reader/subscriptions/subscriptionActions';
import { useReaderActions } from '@/features/reader-shell/reader-actions';

interface SubscriptionsListProps {
  subscriptions: Subscription[];
  isLoading: boolean;
}

type InboxSearch = {
  subscriptionId?: string;
  state?: 'UNREAD' | 'READ' | 'SAVED' | 'NOT_INTERESTED';
};

export function SubscriptionsList({ subscriptions, isLoading }: SubscriptionsListProps) {
  const navigate = useNavigate();
  const { openSubscriptionSettings, openPublishTopic } = useReaderActions();

  const handleAction = (action: SubscriptionAction, subscription: Subscription) => {
    switch (action) {
      case 'settings':
        openSubscriptionSettings(subscription, 'basic');
        return;
      case 'history':
        openSubscriptionSettings(subscription, 'history');
        return;
      case 'suggestions':
        openSubscriptionSettings(subscription, 'suggestions');
        return;
      case 'publish':
        openPublishTopic(subscription);
        return;
      default:
        return;
    }
  };

  if (isLoading) {
    return <div className="px-2 py-2 text-sm text-muted-foreground">Loading…</div>;
  }

  if (subscriptions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        No subscriptions yet. Create one to start.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {subscriptions.map((subscription) => (
        <SubscriptionItem
          key={subscription.id}
          subscription={subscription}
          isSelected={false}
          onSelect={() =>
            navigate({
              to: '/inbox',
              search: (prev: InboxSearch) => ({ ...prev, subscriptionId: subscription.id }),
            })
          }
          onAction={handleAction}
          showMobileActions
        />
      ))}
    </div>
  );
}
