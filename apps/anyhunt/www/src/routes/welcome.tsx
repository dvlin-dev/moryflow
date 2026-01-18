/**
 * Welcome Page (Reader)
 *
 * [INPUT]: None
 * [OUTPUT]: Reader 三栏布局：Welcome（可后台配置）
 * [POS]: C 端默认入口（/welcome）
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { useEffect } from 'react';
import { ReaderThreePane } from '@/features/reader-shell/ReaderThreePane';
import { WelcomeListPane } from '@/features/welcome/WelcomeListPane';
import { WelcomeContentPane } from '@/features/welcome/WelcomeContentPane';
import { useWelcomeOverview } from '@/features/welcome/welcome.hooks';

const welcomeSearchSchema = z.object({
  page: z.string().optional(),
});

export const Route = createFileRoute('/welcome')({
  validateSearch: welcomeSearchSchema,
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
  const navigate = useNavigate();
  const { page } = Route.useSearch();
  const overviewQuery = useWelcomeOverview();

  useEffect(() => {
    if (!overviewQuery.data) return;

    const overview = overviewQuery.data;
    const desired =
      (page && overview.pages.some((p) => p.slug === page) ? page : null) ||
      overview.defaultSlug ||
      overview.pages[0]?.slug ||
      null;

    if (!desired) return;

    if (page !== desired) {
      navigate({
        to: '/welcome',
        search: { page: desired },
        replace: true,
      });
    }
  }, [overviewQuery.data, page, navigate]);

  return (
    <ReaderThreePane
      list={<WelcomeListPane selectedSlug={page ?? null} />}
      detail={<WelcomeContentPane selectedSlug={page ?? null} />}
    />
  );
}
