/**
 * [PROPS]: onCreateSubscription, onOpenSubscriptionSettings
 * [POS]: Reader 左侧边栏（Header actions + Welcome/Recommended/Inbox/Subscriptions）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { Separator } from '@moryflow/ui';
import { useRouterState } from '@tanstack/react-router';
import type { Subscription } from '@/features/digest/types';
import { useInboxStats, useSubscriptions } from '@/features/digest/hooks';
import { SidePanelHeader } from './side-panel/SidePanelHeader';
import { SidePanelInboxSection } from './side-panel/SidePanelInboxSection';
import { SidePanelRecommendedSection } from './side-panel/SidePanelRecommendedSection';
import { SidePanelSubscriptionsSection } from './side-panel/SidePanelSubscriptionsSection';
import { SidePanelWelcomeLink } from './side-panel/SidePanelWelcomeLink';
import { useAuthStore } from '@/stores/auth-store';

interface SidePanelProps {
  onCreateSubscription: (initialTopic?: string) => void;
  onOpenSubscriptionSettings: (subscription: Subscription) => void;
}

export function SidePanel({ onCreateSubscription, onOpenSubscriptionSettings }: SidePanelProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const subscriptionsQuery = useSubscriptions(undefined, { enabled: isAuthenticated });
  const inboxStatsQuery = useInboxStats({ enabled: isAuthenticated });

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3">
        <SidePanelHeader pathname={pathname} search={search} />
      </div>

      <div className="px-3 pb-3 pt-2">
        <SidePanelWelcomeLink pathname={pathname} />
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!isAuthenticated ? (
          <SidePanelRecommendedSection pathname={pathname} />
        ) : (
          <div className="space-y-4">
            <SidePanelInboxSection
              pathname={pathname}
              stats={inboxStatsQuery.data ?? null}
              isLoading={inboxStatsQuery.isLoading}
            />
            <SidePanelSubscriptionsSection
              pathname={pathname}
              subscriptions={subscriptionsQuery.data?.items ?? []}
              isLoading={subscriptionsQuery.isLoading}
              onCreateSubscription={onCreateSubscription}
              onOpenSubscriptionSettings={onOpenSubscriptionSettings}
            />
            <SidePanelRecommendedSection pathname={pathname} />
          </div>
        )}
      </div>
    </div>
  );
}
