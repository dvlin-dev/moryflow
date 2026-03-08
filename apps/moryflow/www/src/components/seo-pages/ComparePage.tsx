/**
 * [PROPS]: { competitor, headline, subheadline, moryflowFit, competitorFit, differences, faqs, relatedPages }
 * [EMITS]: 无
 * [POS]: 可复用对比页组件，以"适合谁"框架组织比较，禁止"谁更强"叙事
 */

'use client';

import { Link } from '@tanstack/react-router';
import { ChevronRight, Check } from 'lucide-react';
import { JsonLd, createFAQPageSchema } from '../seo/JsonLd';
import { FaqSection, type FaqItem } from '../shared/FaqSection';
import { DownloadCtaSection } from '../shared/DownloadCtaSection';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

export interface ComparePageProps {
  /** Competitor name */
  competitor: string;
  /** H1 headline */
  headline: string;
  /** Subheadline */
  subheadline: string;

  /** At-a-glance comparison dimensions */
  dimensions: {
    label: string;
    moryflow: string;
    competitor: string;
  }[];

  /** Who Moryflow is a good fit for */
  moryflowFit: {
    title: string;
    points: string[];
  };

  /** Who the competitor is a good fit for */
  competitorFit: {
    title: string;
    points: string[];
  };

  /** Key differences — neutral framing */
  differences: {
    area: string;
    description: string;
  }[];

  /** FAQ items */
  faqs: FaqItem[];

  /** Related internal links */
  relatedPages?: { label: string; href: string }[];
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
      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="px-4 sm:px-6 py-16 sm:py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="text-sm font-medium text-mory-orange uppercase tracking-wider mb-4">
              {t('compare.label', locale)}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-mory-text-primary mb-6 leading-tight">
              {headline}
            </h1>
            <p className="text-lg text-mory-text-secondary max-w-2xl mx-auto leading-relaxed">
              {subheadline}
            </p>
          </div>
        </section>

        {/* At a Glance */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-4xl">
            <h2 className="font-serif text-2xl font-bold text-mory-text-primary text-center mb-10">
              {t('compare.atAGlance', locale)}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-mory-text-tertiary border-b border-mory-border w-1/3">
                      &nbsp;
                    </th>
                    <th className="text-left p-4 text-sm font-bold text-mory-text-primary border-b border-mory-border w-1/3">
                      Moryflow
                    </th>
                    <th className="text-left p-4 text-sm font-bold text-mory-text-primary border-b border-mory-border w-1/3">
                      {competitor}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dimensions.map((dim) => (
                    <tr key={dim.label}>
                      <td className="p-4 text-sm font-medium text-mory-text-secondary border-b border-mory-border">
                        {dim.label}
                      </td>
                      <td className="p-4 text-sm text-mory-text-secondary border-b border-mory-border">
                        {dim.moryflow}
                      </td>
                      <td className="p-4 text-sm text-mory-text-secondary border-b border-mory-border">
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
        <section className="px-4 sm:px-6 py-16 bg-mory-paper">
          <div className="container mx-auto max-w-5xl">
            <h2 className="font-serif text-2xl font-bold text-mory-text-primary text-center mb-12">
              {t('compare.differentTools', locale)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Moryflow fit */}
              <div className="bg-white rounded-2xl p-8 border border-mory-border">
                <h3 className="font-serif text-lg font-bold text-mory-text-primary mb-6">
                  {moryflowFit.title}
                </h3>
                <ul className="space-y-3">
                  {moryflowFit.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm text-mory-text-secondary"
                    >
                      <Check size={16} className="flex-shrink-0 mt-0.5 text-mory-orange" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Competitor fit */}
              <div className="bg-white rounded-2xl p-8 border border-mory-border">
                <h3 className="font-serif text-lg font-bold text-mory-text-primary mb-6">
                  {competitorFit.title}
                </h3>
                <ul className="space-y-3">
                  {competitorFit.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm text-mory-text-secondary"
                    >
                      <Check size={16} className="flex-shrink-0 mt-0.5 text-mory-text-tertiary" />
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
            <h2 className="font-serif text-2xl font-bold text-mory-text-primary text-center mb-12">
              {t('compare.keyDifferences', locale)}
            </h2>
            <div className="space-y-6">
              {differences.map((diff) => (
                <div
                  key={diff.area}
                  className="bg-mory-paper rounded-2xl p-6 border border-mory-border"
                >
                  <h3 className="font-serif text-base font-bold text-mory-text-primary mb-2">
                    {diff.area}
                  </h3>
                  <p className="text-sm text-mory-text-secondary leading-relaxed">
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
              <h2 className="font-serif text-xl font-bold text-mory-text-primary mb-6">
                {t('shared.learnMore', locale)}
              </h2>
              <div className="flex flex-wrap gap-3">
                {relatedPages.map((page) => (
                  <Link
                    key={page.href}
                    to={getPageHref(page.href, locale)}
                    className="inline-flex items-center gap-1 text-sm text-mory-text-secondary hover:text-mory-text-primary border border-mory-border rounded-lg px-4 py-2 transition-colors"
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
