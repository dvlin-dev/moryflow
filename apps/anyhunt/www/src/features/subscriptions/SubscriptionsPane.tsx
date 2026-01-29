/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: /subscriptions 主内容（订阅管理 + 推荐）
 */

import { Link, useRouterState } from '@tanstack/react-router';
import { Button, Separator } from '@anyhunt/ui';
import { useAuth } from '@/lib/auth-context';
import { useSubscriptions } from '@/features/digest/hooks';
import { SidePanelRecommendedSection } from '@/components/reader/side-panel/SidePanelRecommendedSection';
import { useReaderActions } from '@/features/reader-shell/reader-actions';
import { SubscriptionsList } from './SubscriptionsList';

export function SubscriptionsPane() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated } = useAuth();
  const subscriptionsQuery = useSubscriptions(undefined, { enabled: isAuthenticated });
  const { openCreateSubscription } = useReaderActions();

  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="text-sm font-medium">Sign in to manage subscriptions</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Keep your topics organized in one place.
        </div>
        <Button asChild className="mt-4">
          <Link to="/login" search={{ redirect: '/subscriptions' }}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <div className="text-lg font-semibold">Subscriptions</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Manage your topics and stay in control of your feed.
        </div>
        <Button className="mt-4" onClick={() => openCreateSubscription()}>
          New subscription
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-5">
          <SubscriptionsList
            subscriptions={subscriptionsQuery.data?.items ?? []}
            isLoading={subscriptionsQuery.isLoading}
          />

          <Separator />

          <SidePanelRecommendedSection pathname={pathname} />
        </div>
      </div>
    </div>
  );
}
