/**
 * [PROPS]: subscriptions, stats, currentView, actions
 * [POS]: Reader 左侧边栏（用户区 + Discover/Inbox/Subscriptions 导航）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import { Separator } from '@aiget/ui';
import { useAuth } from '@/lib/auth-context';
import type { InboxStats, Subscription, Topic } from '@/features/digest/types';
import { SidePanelDeveloperEntry } from './side-panel/SidePanelDeveloperEntry';
import { SidePanelDiscoverNav } from './side-panel/SidePanelDiscoverNav';
import { SidePanelFeaturedTopics } from './side-panel/SidePanelFeaturedTopics';
import { SidePanelInboxNav } from './side-panel/SidePanelInboxNav';
import { SidePanelSubscriptions } from './side-panel/SidePanelSubscriptions';
import { SidePanelUserArea } from './side-panel/SidePanelUserArea';
import type { SidePanelActions, SidePanelView } from './side-panel/side-panel.types';

export type { SidePanelView, SidePanelActions } from './side-panel/side-panel.types';

interface SidePanelProps {
  subscriptions: Subscription[];
  userTopics?: Topic[];
  stats: InboxStats | null;
  currentView: SidePanelView;
  actions: SidePanelActions;
  isLoading?: boolean;
}

export function SidePanel({
  subscriptions,
  userTopics = [],
  stats,
  currentView,
  actions,
  isLoading = false,
}: SidePanelProps) {
  const { user, isAuthenticated } = useAuth();
  const showInboxSection = isAuthenticated && subscriptions.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <SidePanelUserArea
          user={user}
          isAuthenticated={isAuthenticated}
          stats={stats}
          onSignIn={actions.auth.onSignIn}
        />
      </div>

      <Separator />

      <SidePanelDiscoverNav
        currentView={currentView}
        onViewChange={actions.navigation.onViewChange}
        onBrowseTopics={actions.navigation.onBrowseTopics}
        onBrowseTopicsHover={actions.navigation.onBrowseTopicsHover}
      />

      <SidePanelDeveloperEntry />

      <Separator />

      <SidePanelFeaturedTopics
        onPreviewTopic={actions.navigation.onPreviewTopic}
        onPreviewTopicHover={actions.navigation.onPreviewTopicHover}
        onBrowseTopics={actions.navigation.onBrowseTopics}
        onBrowseTopicsHover={actions.navigation.onBrowseTopicsHover}
      />

      {showInboxSection && (
        <>
          <Separator />
          <SidePanelInboxNav
            stats={stats}
            currentView={currentView}
            onViewChange={actions.navigation.onViewChange}
          />
        </>
      )}

      <SidePanelSubscriptions
        subscriptions={subscriptions}
        userTopics={userTopics}
        currentView={currentView}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        onCreate={actions.subscriptions.onCreate}
        onCreateHover={actions.subscriptions.onCreateHover}
        onViewChange={actions.navigation.onViewChange}
        onPreviewTopic={actions.navigation.onPreviewTopic}
        onSubscriptionAction={actions.subscriptions.onSubscriptionAction}
      />
    </div>
  );
}
