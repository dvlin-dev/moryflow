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

export function BlogIndexPage() {
  const locale = useLocale();
  const articles = getAllArticles();
  const useCasesHref = getPageHref('/use-cases', locale);

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
          <div className="mt-8 rounded-2xl border border-border bg-card px-6 py-5 text-left shadow-xs">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand">
              {t('shared.browseUseCases', locale)}
            </p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {t('blog.useCasesTitle', locale)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t('blog.useCasesDescription', locale)}
                </p>
              </div>
              <Link
                to={useCasesHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
              >
                {t('shared.browseUseCases', locale)}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Article grid */}
      <section className="pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article) => {
              const fm = article.content[locale]?.frontmatter;
              if (!fm) return null;
              return (
                <Link
                  key={article.slug}
                  to={getPageHref(`/blog/${article.slug}`, locale)}
                  className="group rounded-2xl bg-card shadow-sm p-6 transition-all hover:shadow-lg"
                >
                  <p className="text-lg font-bold text-foreground mb-2 line-clamp-2">{fm.title}</p>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {fm.description}
                  </p>
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
