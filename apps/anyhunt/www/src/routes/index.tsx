/**
 * Homepage - Reader Layout
 *
 * [INPUT]: None
 * [OUTPUT]: Reader 三栏布局（Discover / Topics / Inbox）
 * [POS]: anyhunt.app 主入口（C 端）
 */

import { createFileRoute } from '@tanstack/react-router';
import { ReaderPage } from '@/features/reader/ReaderPage';

export const Route = createFileRoute('/')({
  component: ReaderPage,
  head: () => ({
    meta: [
      { title: 'Anyhunt - AI-Powered Content Digest' },
      {
        name: 'description',
        content:
          'Subscribe to AI-curated topics and get intelligent summaries of what matters. Stay informed without information overload.',
      },
      { property: 'og:title', content: 'Anyhunt - AI-Powered Content Digest' },
      {
        property: 'og:description',
        content: 'Subscribe to AI-curated topics and get intelligent summaries of what matters.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://anyhunt.app' }],
  }),
});
