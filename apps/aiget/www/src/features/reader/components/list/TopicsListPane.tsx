/**
 * [PROPS]: Topics browse list model
 * [POS]: Reader 中栏 - Topics 浏览（纯渲染；懒加载 TopicBrowseList）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import { lazy, Suspense } from 'react';
import type { DigestTopicSummary } from '@/lib/digest-api';
import { ReaderPaneFallback } from '../ReaderPaneFallback';

const LazyTopicBrowseList = lazy(() =>
  import('@/components/reader/TopicBrowseList').then((m) => ({ default: m.TopicBrowseList }))
);

interface TopicsListPaneProps {
  selectedSlug: string | null;
  followedTopicIds: ReadonlySet<string>;
  pendingFollowTopicIds?: ReadonlySet<string>;
  onSelectTopic: (topic: DigestTopicSummary) => void;
  onFollowTopic: (topic: DigestTopicSummary) => void;
  onCreateSubscription: (initialQuery?: string) => void;
}

export function TopicsListPane({
  selectedSlug,
  followedTopicIds,
  pendingFollowTopicIds,
  onSelectTopic,
  onFollowTopic,
  onCreateSubscription,
}: TopicsListPaneProps) {
  return (
    <Suspense fallback={<ReaderPaneFallback variant="list" />}>
      <LazyTopicBrowseList
        enabled={true}
        selectedSlug={selectedSlug}
        followedTopicIds={followedTopicIds}
        pendingFollowTopicIds={pendingFollowTopicIds}
        onSelectTopic={onSelectTopic}
        onFollowTopic={onFollowTopic}
        onCreateSubscription={onCreateSubscription}
      />
    </Suspense>
  );
}
