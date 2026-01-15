/**
 * [PROPS]: currentView + detail pane data/handlers
 * [POS]: Reader 右栏渲染器（Welcome / Discover / Topic Preview / Article）- SRP：只负责详情区切换
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import { lazy, Suspense } from 'react';
import type { DiscoverFeedItem } from '@/features/discover/types';
import type { InboxItem } from '@/features/digest/types';
import { ArticleDetail } from '@/components/reader/ArticleDetail';
import { DiscoverDetail } from '@/components/reader/DiscoverDetail';
import { WelcomeGuide } from '@/components/reader/WelcomeGuide';
import type { SidePanelView } from '@/components/reader/SidePanel';
import { ReaderPaneFallback } from './ReaderPaneFallback';

const LazyTopicPreviewDetail = lazy(() =>
  import('@/components/reader/TopicPreviewDetail').then((m) => ({ default: m.TopicPreviewDetail }))
);

interface ReaderDetailPaneProps {
  currentView: SidePanelView;
  showWelcome: boolean;
  isAuthenticated: boolean;

  selectedDiscoverItem: DiscoverFeedItem | null;
  onPreviewTopic: (slug: string) => void;

  selectedTopicSlug: string | null;
  followedTopicIds: ReadonlySet<string>;
  onFollowTopicBySlug: (slug: string) => void;

  selectedArticle: InboxItem | null;
  onSave: (item: InboxItem) => void;
  onNotInterested: (item: InboxItem) => void;
  fullContent: string | null;
  isLoadingContent: boolean;
  isSaving: boolean;

  onCreateSubscription: (initialQuery?: string) => void;
  onBrowseTopics: () => void;
  onSignIn: () => void;
}

export function ReaderDetailPane({
  currentView,
  showWelcome,
  isAuthenticated,
  selectedDiscoverItem,
  onPreviewTopic,
  selectedTopicSlug,
  followedTopicIds,
  onFollowTopicBySlug,
  selectedArticle,
  onSave,
  onNotInterested,
  fullContent,
  isLoadingContent,
  isSaving,
  onCreateSubscription,
  onBrowseTopics,
  onSignIn,
}: ReaderDetailPaneProps) {
  if (showWelcome) {
    return (
      <WelcomeGuide
        onCreateSubscription={() => onCreateSubscription()}
        onBrowseTopics={onBrowseTopics}
        onSignIn={onSignIn}
        isAuthenticated={isAuthenticated}
      />
    );
  }

  if (currentView.type === 'discover') {
    return <DiscoverDetail item={selectedDiscoverItem} onPreviewTopic={onPreviewTopic} />;
  }

  if (currentView.type === 'topics') {
    return (
      <Suspense fallback={<ReaderPaneFallback variant="detail" />}>
        <LazyTopicPreviewDetail
          slug={selectedTopicSlug}
          followedTopicIds={followedTopicIds}
          onFollowTopic={onFollowTopicBySlug}
        />
      </Suspense>
    );
  }

  return (
    <ArticleDetail
      item={selectedArticle}
      onSave={onSave}
      onNotInterested={onNotInterested}
      fullContent={fullContent}
      isLoadingContent={isLoadingContent}
      isSaving={isSaving}
    />
  );
}
