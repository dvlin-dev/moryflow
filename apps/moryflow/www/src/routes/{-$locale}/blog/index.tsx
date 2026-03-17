import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { getAllArticles } from '@/lib/geo-articles';
import { useLocale } from '@/routes/{-$locale}/route';
import { DownloadCtaSection } from '@/components/shared/DownloadCtaSection';

export const Route = createFileRoute('/{-$locale}/blog/')({
  head: ({ params }) => {
    const locale = resolveLocale(params.locale);
    return getPageMeta({
      pageId: 'blog',
      locale: params.locale,
      title: t('blog.indexTitle', locale),
      description: t('blog.indexDescription', locale),
      path: '/blog',
    });
  },
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const locale = useLocale();
  const articles = getAllArticles();

  return (
    <main className="pt-24 pb-20">
      {/* Hero */}
      <section className="pt-8 pb-16 sm:pt-16 sm:pb-20 px-4 sm:px-6 text-center">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">
            {t('blog.indexTitle', locale)}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('blog.indexDescription', locale)}
          </p>
        </div>
      </section>

      {/* Article grid */}
      <section className="pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article) => {
              const c = article.content[locale];
              return (
                <Link
                  key={article.slug}
                  to={getPageHref(`/blog/${article.slug}`, locale)}
                  className="group rounded-2xl bg-card shadow-sm p-6 transition-all hover:shadow-lg"
                >
                  <p className="text-lg font-bold text-foreground mb-2 line-clamp-2">{c.title}</p>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{c.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-brand group-hover:text-brand-dark transition-colors">
                    {t('blog.readMore', locale)}
                    <ArrowRight size={14} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <DownloadCtaSection
        title={t('downloadCta.title', locale)}
        description={t('downloadCta.desc', locale)}
        trackId="blog-index-download"
      />
    </main>
  );
}
