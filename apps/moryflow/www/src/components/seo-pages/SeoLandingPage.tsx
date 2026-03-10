/**
 * [PROPS]: { headline, subheadline, problemTitle, problemPoints, whyTitle, whyPoints, workflowSteps, faqs, ctaTitle, ctaDescription, relatedPages }
 * [EMITS]: None
 * [POS]: Reusable SEO landing page — Hero → Problem → Why → Workflow → FAQ → CTA
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
  headline: string;
  subheadline: string;
  problemTitle: string;
  problemPoints: { title: string; description: string }[];
  whyTitle: string;
  whyPoints: { icon: LucideIcon; title: string; description: string }[];
  workflowSteps: { step: string; title: string; description: string }[];
  faqs: FaqItem[];
  ctaTitle: string;
  ctaDescription: string;
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
        <section className="relative px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'var(--gradient-hero-glow)' }}
          />
          <div className="container relative mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6 leading-[1.1] tracking-tight">
              {headline}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {subheadline}
            </p>
            <Button
              asChild
              size="lg"
              className="bg-foreground text-background hover:bg-foreground/90 rounded-xl text-base font-medium px-8 py-3 cursor-pointer transition-all hover:shadow-lg"
              data-track-cta="seo-hero-download"
            >
              <Link to={downloadHref}>
                <Download size={18} />
                {t('cta.downloadMoryflow', locale)}
              </Link>
            </Button>
            <p className="mt-3 text-sm text-tertiary">{t('cta.freeToStartFull', locale)}</p>
          </div>
        </section>

        {/* Problem Framing */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12 tracking-tight">
              {problemTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {problemPoints.map((point) => (
                <div
                  key={point.title}
                  className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-bold text-foreground mb-2">{point.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Moryflow */}
        <section
          className="px-4 sm:px-6 py-16"
          style={{ background: 'var(--gradient-section-subtle)' }}
        >
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12 tracking-tight">
              {whyTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {whyPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className="text-center">
                    <div className="w-14 h-14 mx-auto mb-5 bg-brand/10 rounded-xl flex items-center justify-center">
                      <Icon size={28} className="text-brand" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-3">{point.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
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
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12 tracking-tight">
              {t('shared.howItWorks', locale)}
            </h2>
            <div className="space-y-4">
              {workflowSteps.map((ws, i) => (
                <div
                  key={ws.step}
                  className="flex items-start gap-5 bg-card rounded-2xl p-6 shadow-xs hover:shadow-sm transition-shadow"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-brand uppercase tracking-wider mb-1">
                      {ws.step}
                    </p>
                    <h3 className="text-lg font-bold text-foreground mb-1">{ws.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
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
          title={ctaTitle}
          description={ctaDescription}
          trackId="seo-cta-download"
        />
      </main>
    </>
  );
}
