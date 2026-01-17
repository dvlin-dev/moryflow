/**
 * Topic Edition Reader Route
 *
 * [INPUT]: slug, editionId
 * [OUTPUT]: Reader 三栏布局：editions list + edition detail
 * [POS]: /topic/:slug/editions/:editionId - Reader 内文章详情（可分享/可刷新恢复）
 */

import { createFileRoute } from '@tanstack/react-router';
import { ReaderThreePane } from '@/features/reader-shell/ReaderThreePane';
import { TopicPane } from '@/features/topic/TopicPane';

export const Route = createFileRoute('/topic/$slug/editions/$editionId')({
  component: TopicEditionRoute,
});

function TopicEditionRoute() {
  const { slug, editionId } = Route.useParams();

  return (
    <ReaderThreePane
      list={<TopicPane kind="list" slug={slug} selectedEditionId={editionId} />}
      detail={<TopicPane kind="edition" slug={slug} editionId={editionId} />}
    />
  );
}
