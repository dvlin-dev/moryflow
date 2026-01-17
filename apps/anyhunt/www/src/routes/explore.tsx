/**
 * Explore Topics Page (Reader)
 *
 * [INPUT]: URL search state (q)
 * [OUTPUT]: Reader 两栏布局：SidePanel + Explore workbench
 * [POS]: /explore - C 端浏览/搜索/创建订阅入口
 */

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { ReaderTwoPane } from '@/features/reader-shell/ReaderTwoPane';
import { ExploreTopicsPane } from '@/features/explore/ExploreTopicsPane';

const exploreSearchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute('/explore')({
  validateSearch: exploreSearchSchema,
  component: ExploreRoute,
  head: () => ({
    meta: [
      { title: 'Explore topics | Anyhunt' },
      { name: 'description', content: 'Search topics, follow, or create your own subscription.' },
    ],
    links: [{ rel: 'canonical', href: 'https://anyhunt.app/explore' }],
  }),
});

function ExploreRoute() {
  const { q } = Route.useSearch();

  return (
    <ReaderTwoPane>
      <ExploreTopicsPane query={q} />
    </ReaderTwoPane>
  );
}
