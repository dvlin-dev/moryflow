import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { getPageMeta } from '@/lib/seo';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { HOME_COMPARE_INDEX } from '@/lib/homepage-sections';
import { useLocale } from '@/routes/{-$locale}/route';
import { DownloadCtaSection } from '@/components/shared/DownloadCtaSection';

export const Route = createFileRoute('/{-$locale}/compare/')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'compare',
      locale: params.locale,
      title: 'Compare Moryflow',
      description: 'See how Moryflow compares to other tools for AI-powered knowledge work.',
    }),
  component: CompareIndexPage,
});

function CompareIndexPage() {
  const locale = useLocale();

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 px-4 sm:px-6 text-center">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">
            {t('compare.indexTitle', locale)}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('compare.indexSubtitle', locale)}
          </p>
        </div>
      </section>

      {/* Product cards grid */}
      <section className="pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {HOME_COMPARE_INDEX.map((product) => (
              <Link
                key={product.id}
                to={getPageHref(`/compare/${product.id}`, locale)}
                className="group rounded-2xl bg-card shadow-sm p-6 transition-all hover:shadow-lg"
              >
                <p className="text-lg font-bold text-foreground mb-2">vs {product.name}</p>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {t(product.descKey, locale)}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand group-hover:text-brand-dark transition-colors">
                  {t('home.compare.cta', locale)}
                  <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <DownloadCtaSection
        title={t('downloadCta.title', locale)}
        description={t('downloadCta.desc', locale)}
        trackId="compare-index-download"
      />
    </>
  );
}
