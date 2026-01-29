/**
 * Subscriptions Page (Reader)
 *
 * [INPUT]: None
 * [OUTPUT]: Reader 两栏布局：SidePanel + Subscriptions 管理
 * [POS]: /subscriptions - 订阅管理入口（移动端 Tab）
 */

import { createFileRoute } from '@tanstack/react-router';
import { ReaderTwoPane } from '@/features/reader-shell/ReaderTwoPane';
import { SubscriptionsPane } from '@/features/subscriptions/SubscriptionsPane';

export const Route = createFileRoute('/subscriptions')({
  component: SubscriptionsRoute,
  head: () => ({
    meta: [
      { title: 'Subscriptions | Anyhunt' },
      {
        name: 'description',
        content: 'Manage your topics and stay in control of your feed.',
      },
      { property: 'og:title', content: 'Subscriptions | Anyhunt' },
      {
        property: 'og:description',
        content: 'Manage your topics and stay in control of your feed.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://anyhunt.app/subscriptions' }],
  }),
});

function SubscriptionsRoute() {
  return (
    <ReaderTwoPane>
      <SubscriptionsPane />
    </ReaderTwoPane>
  );
}
