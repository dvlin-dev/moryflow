/**
 * Welcome Page (Reader)
 *
 * [INPUT]: None
 * [OUTPUT]: Reader 三栏布局：Welcome（可后台配置）
 * [POS]: C 端默认入口（/welcome）
 */

import { createFileRoute } from '@tanstack/react-router';
import { ReaderThreePane } from '@/features/reader-shell/ReaderThreePane';
import { WelcomePane } from '@/features/welcome/WelcomePane';

export const Route = createFileRoute('/welcome')({
  component: WelcomeRoute,
  head: () => ({
    meta: [
      { title: 'Anyhunt' },
      { name: 'description', content: 'Any topic. AI hunts' },
      { property: 'og:title', content: 'Anyhunt' },
      { property: 'og:description', content: 'Always-on updates from across the web.' },
    ],
    links: [{ rel: 'canonical', href: 'https://anyhunt.app/welcome' }],
  }),
});

function WelcomeRoute() {
  return (
    <ReaderThreePane
      list={<WelcomePane kind="outline" />}
      detail={<WelcomePane kind="content" />}
    />
  );
}
