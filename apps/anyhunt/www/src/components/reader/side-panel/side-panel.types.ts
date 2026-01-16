/**
 * [DEFINES]: SidePanelView, SidePanelActions
 * [USED_BY]: SidePanel, ReaderPage
 * [POS]: SidePanel 的视图状态与 actions 结构（收敛长 Props，提升可维护性）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import type { DiscoverFeedType } from '@/features/discover/types';
import type { Subscription } from '@/features/digest/types';
import type { SubscriptionAction } from '../subscriptions/subscriptionActions';

export type SidePanelView =
  | { type: 'inbox'; filter: 'all' | 'saved' | string }
  | { type: 'discover'; feed: DiscoverFeedType }
  | { type: 'topics' };

export interface SidePanelActions {
  auth: {
    onSignIn: () => void;
  };
  navigation: {
    onViewChange: (view: SidePanelView) => void;
    onBrowseTopics: () => void;
    onBrowseTopicsHover?: () => void;
    onPreviewTopic?: (slug: string) => void;
    onPreviewTopicHover?: (slug: string) => void;
  };
  subscriptions: {
    onCreate: () => void;
    onCreateHover?: () => void;
    onSubscriptionAction: (action: SubscriptionAction, subscription: Subscription) => void;
  };
}
