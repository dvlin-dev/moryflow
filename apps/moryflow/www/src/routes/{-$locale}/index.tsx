import { createFileRoute } from '@tanstack/react-router';
import { getCanonicalUrl, getPageMeta } from '@/lib/seo';
import { JsonLd, createWebPageSchema, productSchema } from '@/components/seo/JsonLd';
import { resolveLocale, t } from '@/lib/i18n';
import { useLocale } from './route';
import { HomePageSections } from '@/components/landing';

export const Route = createFileRoute('/{-$locale}/')({
  head: ({ params }) => {
    const locale = resolveLocale(params.locale);
    const meta = getPageMeta({
      pageId: 'home',
      locale,
      title: t('meta.home.title', locale),
      description: t('meta.home.description', locale),
    });
    return {
      ...meta,
      links: [
        ...meta.links,
        // Preload LCP hero image — only on homepage
        { rel: 'preload', href: '/home-all-dark-640w.avif', as: 'image', type: 'image/avif' },
      ],
    };
  },
  component: HomePage,
});

function HomePage() {
  const locale = useLocale();
  const title = t('meta.home.title', locale);
  const description = t('meta.home.description', locale);

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd
        data={createWebPageSchema({
          name: title,
          description,
          url: getCanonicalUrl('/', locale),
        })}
      />
      <main>
        <HomePageSections />
      </main>
    </>
  );
}
