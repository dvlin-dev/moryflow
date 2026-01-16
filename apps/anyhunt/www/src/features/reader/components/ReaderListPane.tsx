/**
 * [PROPS]: model (判别联合 ViewModel)
 * [POS]: Reader 中栏视图切换（Discover / Topics / Inbox）- SRP：只负责按 model.type 分发渲染
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import type { ReaderListPaneModel } from '../reader.models';
import { DiscoverListPane } from './list/DiscoverListPane';
import { InboxListPane } from './list/InboxListPane';
import { TopicsListPane } from './list/TopicsListPane';

interface ReaderListPaneProps {
  model: ReaderListPaneModel;
}

export function ReaderListPane({ model }: ReaderListPaneProps) {
  switch (model.type) {
    case 'discover':
      return (
        <DiscoverListPane
          items={model.items}
          selectedId={model.selectedId}
          feedType={model.feedType}
          isLoading={model.isLoading}
          isRefreshing={model.isRefreshing}
          onSelect={model.onSelect}
          onFeedTypeChange={model.onFeedTypeChange}
          onRefresh={model.onRefresh}
        />
      );
    case 'topics':
      return (
        <TopicsListPane
          selectedSlug={model.selectedSlug}
          followedTopicIds={model.followedTopicIds}
          pendingFollowTopicIds={model.pendingFollowTopicIds}
          onSelectTopic={model.onSelectTopic}
          onFollowTopic={model.onFollowTopic}
          onCreateSubscription={model.onCreateSubscription}
        />
      );
    case 'inbox':
      return (
        <InboxListPane
          items={model.items}
          selectedId={model.selectedId}
          title={model.title}
          filter={model.filter}
          isLoading={model.isLoading}
          isRefreshing={model.isRefreshing}
          onSelect={model.onSelect}
          onFilterChange={model.onFilterChange}
          onRefresh={model.onRefresh}
          onMarkAllRead={model.onMarkAllRead}
        />
      );
    default: {
      const _exhaustive: never = model;
      return _exhaustive;
    }
  }
}
