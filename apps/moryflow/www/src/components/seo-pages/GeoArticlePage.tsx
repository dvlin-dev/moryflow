/**
 * [PROPS]: { content, publishedAt }
 * [EMITS]: None
 * [POS]: GEO article template — Hero → Key Takeaways → Sections → FAQ → Related → CTA
 */

'use client';

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
import type { GeoArticleContent } from '@/lib/geo-articles';

interface GeoArticlePageProps {
  content: GeoArticleContent;
  publishedAt: string;
}

export function GeoArticlePage({ content, publishedAt }: GeoArticlePageProps) {
  const locale = useLocale();
  const stars = useGitHubStars();
  const downloadHref = getPageHref('/download', locale);

  return (
    <>
      <JsonLd
        data={createArticleSchema({
          headline: content.headline,
          description: content.description,
          datePublished: publishedAt,
        })}
      />
      <JsonLd data={createFAQPageSchema(content.faqs)} />
      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="relative px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'var(--gradient-hero-glow)' }}
          />
          <div className="container relative mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6 leading-[1.1] tracking-tight">
              {content.headline}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {content.subheadline}
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
                {content.keyTakeaways.map((point) => (
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

        {/* Body Sections */}
        {content.sections.map((section) => (
          <section key={section.heading} className="px-4 sm:px-6 py-8">
            <div className="container mx-auto max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 tracking-tight">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed mb-4">
                  {paragraph}
                </p>
              ))}
              {section.callout && (
                <blockquote className="border-l-4 border-brand/30 bg-card rounded-r-xl pl-6 pr-4 py-4 my-6 text-foreground italic">
                  {section.callout}
                </blockquote>
              )}
            </div>
          </section>
        ))}

        {/* FAQ */}
        <FaqSection title={t('shared.faqTitle', locale)} faqs={content.faqs} />

        {/* Related Pages */}
        {content.relatedPages.length > 0 && (
          <section className="px-4 sm:px-6 py-12">
            <div className="container mx-auto max-w-3xl">
              <h2 className="text-xl font-bold text-foreground mb-6">
                {t('shared.learnMore', locale)}
              </h2>
              <div className="flex flex-wrap gap-3">
                {content.relatedPages.map((page) => (
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
        <GeoCtaSection title={content.ctaTitle} description={content.ctaDescription} />
      </main>
    </>
  );
}
