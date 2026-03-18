/**
 * [PROPS]: { competitor, headline, subheadline, dimensions, moryflowFit, competitorFit, differences, faqs, relatedPages }
 * [EMITS]: None
 * [POS]: Reusable comparison page — neutral "who it's for" framing
 */

'use client';

import { Link } from '@tanstack/react-router';
import { ChevronRight, Check } from 'lucide-react';
import { JsonLd, createFAQPageSchema, createBreadcrumbSchema } from '../seo/JsonLd';
import { siteConfig } from '@/lib/seo';
import { localePath } from '@/lib/i18n';
import { FaqSection, type FaqItem } from '../shared/FaqSection';
import { DownloadCtaSection } from '../shared/DownloadCtaSection';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

export interface ComparePageProps {
  competitor: string;
  headline: string;
  subheadline: string;
  dimensions: {
    label: string;
    moryflow: string;
    competitor: string;
  }[];
  moryflowFit: {
    title: string;
    points: string[];
  };
  competitorFit: {
    title: string;
    points: string[];
  };
  differences: {
    area: string;
    description: string;
  }[];
  faqs: FaqItem[];
  relatedPages?: { label: string; href: string }[];
}

/** Shared content shape for compare route files (en/zh per-locale data). */
export interface ComparePageContent {
  title: string;
  description: string;
  headline: string;
  subheadline: string;
  dimensions: ComparePageProps['dimensions'];
  moryflowFit: ComparePageProps['moryflowFit'];
  competitorFit: ComparePageProps['competitorFit'];
  differences: ComparePageProps['differences'];
  faqs: FaqItem[];
  relatedPages: NonNullable<ComparePageProps['relatedPages']>;
}

export function ComparePage({
  competitor,
  headline,
  subheadline,
  dimensions,
  moryflowFit,
  competitorFit,
  differences,
  faqs,
  relatedPages,
}: ComparePageProps) {
  const locale = useLocale();

  return (
    <>
      <JsonLd data={createFAQPageSchema(faqs)} />
      <JsonLd
        data={createBreadcrumbSchema([
          { name: 'Home', url: `${siteConfig.url}${localePath('/', locale)}` },
          { name: 'Compare', url: `${siteConfig.url}${localePath('/compare', locale)}` },
          {
            name: competitor,
            url: `${siteConfig.url}${localePath(`/compare/${competitor.toLowerCase()}`, locale)}`,
          },
        ])}
      />
      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="relative px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'var(--gradient-hero-glow)' }}
          />
          <div className="container relative mx-auto max-w-4xl text-center">
            <p className="text-sm font-medium text-brand uppercase tracking-wider mb-4">
              {t('compare.label', locale)}
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-6 leading-[1.1] tracking-tight">
              {headline}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {subheadline}
            </p>
          </div>
        </section>

        {/* At a Glance */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-10 tracking-tight">
              {t('compare.atAGlance', locale)}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border shadow-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left p-4 text-sm font-medium text-tertiary border-b border-border w-1/3">
                      &nbsp;
                    </th>
                    <th className="text-left p-4 text-sm font-bold text-foreground border-b border-border w-1/3">
                      Moryflow
                    </th>
                    <th className="text-left p-4 text-sm font-bold text-foreground border-b border-border w-1/3">
                      {competitor}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dimensions.map((dim) => (
                    <tr key={dim.label} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 text-sm font-medium text-muted-foreground border-b border-border">
                        {dim.label}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground border-b border-border">
                        {dim.moryflow}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground border-b border-border">
                        {dim.competitor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Who It's For */}
        <section
          className="px-4 sm:px-6 py-16"
          style={{ background: 'var(--gradient-section-subtle)' }}
        >
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-12 tracking-tight">
              {t('compare.differentTools', locale)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-card rounded-2xl p-8 shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-6">{moryflowFit.title}</h3>
                <ul className="space-y-3">
                  {moryflowFit.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <Check size={16} className="flex-shrink-0 mt-0.5 text-brand" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card rounded-2xl p-8 shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-6">{competitorFit.title}</h3>
                <ul className="space-y-3">
                  {competitorFit.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <Check size={16} className="flex-shrink-0 mt-0.5 text-tertiary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Key Differences */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-12 tracking-tight">
              {t('compare.keyDifferences', locale)}
            </h2>
            <div className="space-y-4">
              {differences.map((diff) => (
                <div
                  key={diff.area}
                  className="bg-card rounded-2xl p-6 shadow-xs hover:shadow-sm transition-shadow"
                >
                  <h3 className="text-base font-bold text-foreground mb-2">{diff.area}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {diff.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FaqSection title={t('shared.faqTitle', locale)} faqs={faqs} />

        {/* Related Pages */}
        {relatedPages && relatedPages.length > 0 && (
          <section className="px-4 sm:px-6 py-12">
            <div className="container mx-auto max-w-3xl">
              <h2 className="text-xl font-bold text-foreground mb-6">
                {t('shared.learnMore', locale)}
              </h2>
              <div className="flex flex-wrap gap-3">
                {relatedPages.map((page) => (
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

        {/* CTA */}
        <DownloadCtaSection
          title={t('compare.tryTitle', locale)}
          description={t('compare.tryDesc', locale)}
          trackId="compare-cta-download"
        />
      </main>
    </>
  );
}
