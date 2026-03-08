/**
 * [PROPS]: { headline, subheadline, problemTitle, problemPoints, whyTitle, whyPoints, workflowSteps, faqs, ctaTitle, ctaDescription }
 * [EMITS]: 无
 * [POS]: 可复用 SEO 落地页组件，统一 Hero → Problem → Why Moryflow → Workflow → FAQ → CTA 结构
 */

'use client';

import { Link } from '@tanstack/react-router';
import { Download, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { JsonLd, createFAQPageSchema } from '../seo/JsonLd';
import { FaqSection, type FaqItem } from '../shared/FaqSection';
import { DownloadCtaSection } from '../shared/DownloadCtaSection';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

export interface SeoLandingPageProps {
  /** H1 headline */
  headline: string;
  /** Subheadline below H1 */
  subheadline: string;

  /** Problem framing section */
  problemTitle: string;
  problemPoints: { title: string; description: string }[];

  /** Why Moryflow section */
  whyTitle: string;
  whyPoints: { icon: LucideIcon; title: string; description: string }[];

  /** Workflow steps */
  workflowSteps: { step: string; title: string; description: string }[];

  /** FAQ items for both display and schema */
  faqs: FaqItem[];

  /** Bottom CTA */
  ctaTitle: string;
  ctaDescription: string;

  /** Related pages for internal linking */
  relatedPages?: { label: string; href: string }[];
}

export function SeoLandingPage({
  headline,
  subheadline,
  problemTitle,
  problemPoints,
  whyTitle,
  whyPoints,
  workflowSteps,
  faqs,
  ctaTitle,
  ctaDescription,
  relatedPages,
}: SeoLandingPageProps) {
  const locale = useLocale();
  const downloadHref = getPageHref('/download', locale);

  return (
    <>
      <JsonLd data={createFAQPageSchema(faqs)} />
      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="px-4 sm:px-6 py-16 sm:py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-mory-text-primary mb-6 leading-tight">
              {headline}
            </h1>
            <p className="text-lg sm:text-xl text-mory-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              {subheadline}
            </p>
            <Button
              asChild
              size="lg"
              className="bg-mory-text-primary text-white hover:bg-black rounded-xl text-base font-medium px-8 py-3 cursor-pointer"
              data-track-cta="seo-hero-download"
            >
              <Link to={downloadHref}>
                <Download size={18} />
                {t('cta.downloadMoryflow', locale)}
              </Link>
            </Button>
            <p className="mt-3 text-sm text-mory-text-tertiary">{t('cta.freeBetaFull', locale)}</p>
          </div>
        </section>

        {/* Problem Framing */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-5xl">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-mory-text-primary text-center mb-12">
              {problemTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {problemPoints.map((point) => (
                <div
                  key={point.title}
                  className="bg-mory-paper rounded-2xl p-6 border border-mory-border"
                >
                  <h3 className="font-serif text-lg font-bold text-mory-text-primary mb-2">
                    {point.title}
                  </h3>
                  <p className="text-sm text-mory-text-secondary leading-relaxed">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Moryflow */}
        <section className="px-4 sm:px-6 py-16 bg-mory-paper">
          <div className="container mx-auto max-w-5xl">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-mory-text-primary text-center mb-12">
              {whyTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {whyPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className="text-center">
                    <div className="w-14 h-14 mx-auto mb-5 bg-mory-orange/10 rounded-2xl flex items-center justify-center">
                      <Icon size={28} className="text-mory-orange" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-mory-text-primary mb-3">
                      {point.title}
                    </h3>
                    <p className="text-sm text-mory-text-secondary leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-4xl">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-mory-text-primary text-center mb-12">
              {t('shared.howItWorks', locale)}
            </h2>
            <div className="space-y-6">
              {workflowSteps.map((ws, i) => (
                <div
                  key={ws.step}
                  className="flex items-start gap-5 bg-mory-paper rounded-2xl p-6 border border-mory-border"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-mory-orange/10 flex items-center justify-center text-mory-orange font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-mory-orange uppercase tracking-wider mb-1">
                      {ws.step}
                    </p>
                    <h3 className="font-serif text-lg font-bold text-mory-text-primary mb-1">
                      {ws.title}
                    </h3>
                    <p className="text-sm text-mory-text-secondary leading-relaxed">
                      {ws.description}
                    </p>
                  </div>
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
          title={ctaTitle}
          description={ctaDescription}
          trackId="seo-cta-download"
        />
      </main>
    </>
  );
}
