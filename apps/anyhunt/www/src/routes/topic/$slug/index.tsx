/**
 * Topic Reader Route
 *
 * [INPUT]: slug
 * [OUTPUT]: Reader 三栏布局：editions list + topic/edition detail
 * [POS]: /topic/:slug - Reader 内话题浏览入口（可刷新恢复）
 */

import { createFileRoute } from '@tanstack/react-router';
import { ReaderThreePane } from '@/features/reader-shell/ReaderThreePane';
import { TopicPane } from '@/features/topic/TopicPane';

export const Route = createFileRoute('/topic/$slug/')({
  component: TopicRoute,
});

function TopicRoute() {
  const { slug } = Route.useParams();

  return (
    <ReaderThreePane
      list={<TopicPane kind="list" slug={slug} selectedEditionId={null} />}
      detail={<TopicPane kind="overview" slug={slug} />}
    />
  );
}
