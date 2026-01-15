/**
 * [PROPS]: model (判别联合 ViewModel)
 * [POS]: Reader 右栏视图切换（Welcome / Discover / Topic Preview / Article）- SRP：只负责按 model.type 分发渲染
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import type { ReaderDetailPaneModel } from '../reader.models';
import { ArticleDetailPane } from './detail/ArticleDetailPane';
import { DiscoverDetailPane } from './detail/DiscoverDetailPane';
import { TopicPreviewPane } from './detail/TopicPreviewPane';
import { WelcomePane } from './detail/WelcomePane';

interface ReaderDetailPaneProps {
  model: ReaderDetailPaneModel;
}

export function ReaderDetailPane({ model }: ReaderDetailPaneProps) {
  switch (model.type) {
    case 'welcome':
      return (
        <WelcomePane
          isAuthenticated={model.isAuthenticated}
          onCreateSubscription={model.onCreateSubscription}
          onCreateSubscriptionHover={model.onCreateSubscriptionHover}
          onBrowseTopics={model.onBrowseTopics}
          onBrowseTopicsHover={model.onBrowseTopicsHover}
          onSignIn={model.onSignIn}
        />
      );
    case 'discover':
      return (
        <DiscoverDetailPane
          item={model.item}
          onPreviewTopic={model.onPreviewTopic}
          onPreviewTopicHover={model.onPreviewTopicHover}
        />
      );
    case 'topics':
      return (
        <TopicPreviewPane
          slug={model.slug}
          followedTopicIds={model.followedTopicIds}
          pendingFollowTopicIds={model.pendingFollowTopicIds}
          onFollowTopic={model.onFollowTopic}
        />
      );
    case 'article':
      return (
        <ArticleDetailPane
          item={model.item}
          fullContent={model.fullContent}
          isLoadingContent={model.isLoadingContent}
          isSaving={model.isSaving}
          onSave={model.onSave}
          onNotInterested={model.onNotInterested}
        />
      );
    default: {
      const _exhaustive: never = model;
      return _exhaustive;
    }
  }
}
