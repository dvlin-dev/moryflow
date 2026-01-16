/**
 * [DEFINES]: ReaderListPaneModel, ReaderDetailPaneModel
 * [USED_BY]: ReaderPage, ReaderListPane, ReaderDetailPane
 * [POS]: Reader “分支视图”ViewModel 判别联合（收敛长 Props，明确边界）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import type { DiscoverFeedItem, DiscoverFeedType } from '@/features/discover/types';
import type { InboxItem } from '@/features/digest/types';
import type { DigestTopicSummary } from '@/lib/digest-api';
import type { FilterState } from './reader.types';

export type ReaderListPaneModel =
  | {
      type: 'discover';
      items: DiscoverFeedItem[];
      selectedId: string | null;
      feedType: DiscoverFeedType;
      isLoading: boolean;
      isRefreshing: boolean;
      onSelect: (item: DiscoverFeedItem) => void;
      onFeedTypeChange: (feedType: DiscoverFeedType) => void;
      onRefresh: () => void;
    }
  | {
      type: 'topics';
      selectedSlug: string | null;
      followedTopicIds: ReadonlySet<string>;
      pendingFollowTopicIds?: ReadonlySet<string>;
      onSelectTopic: (topic: DigestTopicSummary) => void;
      onFollowTopic: (topic: DigestTopicSummary) => void;
      onCreateSubscription: (initialQuery?: string) => void;
    }
  | {
      type: 'inbox';
      items: InboxItem[];
      selectedId: string | null;
      title: string;
      filter: FilterState;
      isLoading: boolean;
      isRefreshing: boolean;
      onSelect: (item: InboxItem) => void;
      onFilterChange: (filter: FilterState) => void;
      onRefresh: () => void;
      onMarkAllRead: () => void;
    };

export type ReaderDetailPaneModel =
  | {
      type: 'welcome';
      isAuthenticated: boolean;
      onCreateSubscription: (initialQuery?: string) => void;
      onCreateSubscriptionHover?: () => void;
      onBrowseTopics: () => void;
      onBrowseTopicsHover?: () => void;
      onSignIn: () => void;
    }
  | {
      type: 'discover';
      item: DiscoverFeedItem | null;
      onPreviewTopic: (slug: string) => void;
      onPreviewTopicHover?: (slug: string) => void;
    }
  | {
      type: 'topics';
      slug: string | null;
      followedTopicIds: ReadonlySet<string>;
      pendingFollowTopicIds?: ReadonlySet<string>;
      onFollowTopic: (topic: { id: string; slug: string }) => void;
    }
  | {
      type: 'article';
      item: InboxItem | null;
      fullContent: string | null;
      isLoadingContent: boolean;
      isSaving: boolean;
      onSave: (item: InboxItem) => void;
      onNotInterested: (item: InboxItem) => void;
    };
