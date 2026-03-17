/**
 * [PROPS]: { frontmatter, MdBody, publishedAt }
 * [EMITS]: None
 * [POS]: GEO article template — Hero → Key Takeaways → MD Body (prose) → FAQ → Related → CTA
 */

'use client';

import type { ComponentType } from 'react';
import { Link } from '@tanstack/react-router';
import { Download, Star, ChevronRight } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { JsonLd, createFAQPageSchema, createArticleSchema } from '../seo/JsonLd';
import { FaqSection } from '../shared/FaqSection';
import { GeoCtaSection } from '../shared/GeoCtaSection';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useGitHubStars, formatStarCount } from '@/hooks/useGitHubStars';
import type { GeoFrontmatter } from '@/lib/geo-articles';

interface GeoArticlePageProps {
  frontmatter: GeoFrontmatter;
  MdBody: ComponentType;
}

export function GeoArticlePage({ frontmatter: fm, MdBody }: GeoArticlePageProps) {
  const locale = useLocale();
  const stars = useGitHubStars();
  const downloadHref = getPageHref('/download', locale);

  return (
    <>
      <JsonLd
        data={createArticleSchema({
          headline: fm.headline,
          description: fm.description,
          datePublished: fm.publishedAt,
        })}
      />
      <JsonLd data={createFAQPageSchema(fm.faqs)} />
      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="relative px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'var(--gradient-hero-glow)' }}
          />
          <div className="container relative mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6 leading-[1.1] tracking-tight">
              {fm.headline}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {fm.subheadline}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-xl text-base font-medium px-8 py-3 border border-border bg-card text-foreground hover:bg-card hover:border-brand/30 transition-all hover:shadow-lg"
                data-track-cta="geo-hero-github-star"
              >
                <a
                  href="https://github.com/dvlin-dev/moryflow"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Star size={18} className="text-brand" />
                  {t('home.hero.starOnGithub', locale)}
                  {stars !== null && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand font-semibold">
                      {formatStarCount(stars)}
                    </span>
                  )}
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                className="rounded-xl text-base font-medium px-8 py-3 bg-foreground text-background hover:bg-foreground/90 transition-all hover:shadow-lg"
                data-track-cta="geo-hero-download"
              >
                <Link to={downloadHref}>
                  <Download size={18} />
                  {t('cta.downloadMoryflow', locale)}
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-tertiary">{t('home.hero.freeToStart', locale)}</p>
          </div>
        </section>

        {/* Key Takeaways */}
        <aside className="px-4 sm:px-6 py-12">
          <div className="container mx-auto max-w-3xl">
            <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-sm border border-brand/10">
              <h2 className="text-xl font-bold text-foreground mb-4">
                {t('blog.keyTakeaways', locale)}
              </h2>
              <ul className="space-y-3">
                {fm.keyTakeaways.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* MD Body — rendered via prose typography */}
        <article className="px-4 sm:px-6 py-8">
          <div className="container mx-auto max-w-3xl prose prose-neutral dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:sm:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-muted-foreground prose-p:leading-relaxed prose-blockquote:border-l-4 prose-blockquote:border-brand/30 prose-blockquote:bg-card prose-blockquote:rounded-r-xl prose-blockquote:pl-6 prose-blockquote:pr-4 prose-blockquote:py-4 prose-blockquote:not-italic prose-blockquote:text-foreground">
            <MdBody />
          </div>
        </article>

        {/* FAQ */}
        <FaqSection title={t('shared.faqTitle', locale)} faqs={fm.faqs} />

        {/* Related Pages */}
        {fm.relatedPages.length > 0 && (
          <section className="px-4 sm:px-6 py-12">
            <div className="container mx-auto max-w-3xl">
              <h2 className="text-xl font-bold text-foreground mb-6">
                {t('shared.learnMore', locale)}
              </h2>
              <div className="flex flex-wrap gap-3">
                {fm.relatedPages.map((page) => (
                  <Link
                    key={page.href}
                    to={getPageHref(page.href, locale)}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-4 py-2 transition-colors hover:shadow-xs"
                  >
                    {page.label}
                    <ChevronRight size={14} />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <GeoCtaSection title={fm.ctaTitle} description={fm.ctaDescription} />
      </main>
    </>
  );
}
