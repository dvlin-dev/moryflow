/**
 * [PROPS]: Topic preview model
 * [POS]: Reader 右栏 - Topic 预览（纯渲染；懒加载 TopicPreviewDetail）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import { lazy, Suspense } from 'react';
import { ReaderPaneFallback } from '../ReaderPaneFallback';

const LazyTopicPreviewDetail = lazy(() =>
  import('@/components/reader/TopicPreviewDetail').then((m) => ({ default: m.TopicPreviewDetail }))
);

interface TopicPreviewPaneProps {
  slug: string | null;
  followedTopicIds: ReadonlySet<string>;
  pendingFollowTopicIds?: ReadonlySet<string>;
  onFollowTopic: (topic: { id: string; slug: string }) => void;
}

export function TopicPreviewPane({
  slug,
  followedTopicIds,
  pendingFollowTopicIds,
  onFollowTopic,
}: TopicPreviewPaneProps) {
  return (
    <Suspense fallback={<ReaderPaneFallback variant="detail" />}>
      <LazyTopicPreviewDetail
        slug={slug}
        followedTopicIds={followedTopicIds}
        pendingFollowTopicIds={pendingFollowTopicIds}
        onFollowTopic={onFollowTopic}
      />
    </Suspense>
  );
}
