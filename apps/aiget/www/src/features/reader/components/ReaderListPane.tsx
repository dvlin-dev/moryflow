/**
 * [PROPS]: currentView + list pane data/handlers
 * [POS]: Reader 中栏渲染器（Discover / Topics / Inbox）- SRP：只负责列表区切换
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import { lazy, Suspense } from 'react';
import type { DiscoverFeedItem, DiscoverFeedType } from '@/features/discover/types';
import type { DigestTopicSummary } from '@/lib/digest-api';
import type { InboxItem } from '@/features/digest/types';
import { DiscoverFeedList } from '@/components/reader/DiscoverFeedList';
import { ArticleList } from '@/components/reader/ArticleList';
import type { SidePanelView } from '@/components/reader/SidePanel';
import { ReaderPaneFallback } from './ReaderPaneFallback';
import type { FilterState } from '../reader.types';

const LazyTopicBrowseList = lazy(() =>
  import('@/components/reader/TopicBrowseList').then((m) => ({ default: m.TopicBrowseList }))
);

interface ReaderListPaneProps {
  currentView: SidePanelView;

  discoverItems: DiscoverFeedItem[];
  selectedDiscoverItemId: string | null;
  onSelectDiscoverItem: (item: DiscoverFeedItem) => void;
  discoverFeedType: DiscoverFeedType;
  onDiscoverFeedTypeChange: (feedType: DiscoverFeedType) => void;
  onDiscoverRefresh: () => void;
  isDiscoverLoading: boolean;
  isDiscoverRefreshing: boolean;

  selectedTopicSlug: string | null;
  followedTopicIds: ReadonlySet<string>;
  pendingFollowTopicIds?: ReadonlySet<string>;
  onSelectTopic: (topic: DigestTopicSummary) => void;
  onFollowTopic: (topic: DigestTopicSummary) => void;
  onCreateSubscription: (initialQuery?: string) => void;

  inboxItems: InboxItem[];
  selectedArticleId: string | null;
  onSelectArticle: (item: InboxItem) => void;
  inboxTitle: string;
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onInboxRefresh: () => void;
  onMarkAllRead: () => void;
  isInboxLoading: boolean;
  isInboxRefreshing: boolean;
}

export function ReaderListPane({
  currentView,
  discoverItems,
  selectedDiscoverItemId,
  onSelectDiscoverItem,
  discoverFeedType,
  onDiscoverFeedTypeChange,
  onDiscoverRefresh,
  isDiscoverLoading,
  isDiscoverRefreshing,
  selectedTopicSlug,
  followedTopicIds,
  pendingFollowTopicIds,
  onSelectTopic,
  onFollowTopic,
  onCreateSubscription,
  inboxItems,
  selectedArticleId,
  onSelectArticle,
  inboxTitle,
  filter,
  onFilterChange,
  onInboxRefresh,
  onMarkAllRead,
  isInboxLoading,
  isInboxRefreshing,
}: ReaderListPaneProps) {
  if (currentView.type === 'discover') {
    return (
      <DiscoverFeedList
        items={discoverItems}
        selectedId={selectedDiscoverItemId}
        onSelect={onSelectDiscoverItem}
        feedType={discoverFeedType}
        onFeedTypeChange={onDiscoverFeedTypeChange}
        onRefresh={onDiscoverRefresh}
        isLoading={isDiscoverLoading}
        isRefreshing={isDiscoverRefreshing}
      />
    );
  }

  if (currentView.type === 'topics') {
    return (
      <Suspense fallback={<ReaderPaneFallback variant="list" />}>
        <LazyTopicBrowseList
          enabled={true}
          selectedSlug={selectedTopicSlug}
          followedTopicIds={followedTopicIds}
          pendingFollowTopicIds={pendingFollowTopicIds}
          onSelectTopic={onSelectTopic}
          onFollowTopic={onFollowTopic}
          onCreateSubscription={onCreateSubscription}
        />
      </Suspense>
    );
  }

  return (
    <ArticleList
      items={inboxItems}
      selectedId={selectedArticleId}
      onSelect={onSelectArticle}
      title={inboxTitle}
      filter={filter}
      onFilterChange={onFilterChange}
      onRefresh={onInboxRefresh}
      onMarkAllRead={onMarkAllRead}
      isLoading={isInboxLoading}
      isRefreshing={isInboxRefreshing}
    />
  );
}
