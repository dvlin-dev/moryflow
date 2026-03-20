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
        // Responsive preload for LCP hero image — matches <picture> srcSet in AgentFirstHero
        {
          rel: 'preload',
          as: 'image',
          type: 'image/avif',
          imageSrcSet:
            '/home-all-dark-640w.avif 640w, /home-all-dark-1024w.avif 1024w, /home-all-dark-1440w.avif 1440w, /home-all-dark-1920w.avif 1920w',
          imageSizes: '(max-width: 1024px) 100vw, 896px',
        },
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
