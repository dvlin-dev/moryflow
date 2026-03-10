'use client';

import { createFileRoute, Link } from '@tanstack/react-router';
import { getCanonicalUrl, getPageMeta } from '@/lib/seo';
import { JsonLd, createWebPageSchema } from '@/components/seo/JsonLd';
import { Bot, NotebookPen, Shield, Globe, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { resolveLocale, t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';

export const Route = createFileRoute('/{-$locale}/features')({
  head: ({ params }) => {
    const locale = resolveLocale(params.locale);
    return getPageMeta({
      pageId: 'features',
      locale,
      title: t('meta.features.title', locale),
      description: t('meta.features.description', locale),
    });
  },
  component: FeaturesPage,
});

interface Feature {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  detailKeys: string[];
  tintBg: string;
  tintText: string;
}

const featureConfigs: Feature[] = [
  {
    icon: Bot,
    titleKey: 'features.agentTitle',
    descKey: 'features.agentDesc',
    detailKeys: ['features.agentDetail1', 'features.agentDetail2', 'features.agentDetail3'],
    tintBg: 'bg-brand/10',
    tintText: 'text-brand',
  },
  {
    icon: NotebookPen,
    titleKey: 'features.memoryTitle',
    descKey: 'features.memoryDesc',
    detailKeys: ['features.memoryDetail1', 'features.memoryDetail2', 'features.memoryDetail3'],
    tintBg: 'bg-success/10',
    tintText: 'text-success',
  },
  {
    icon: Shield,
    titleKey: 'features.notesTitle',
    descKey: 'features.notesDesc',
    detailKeys: ['features.notesDetail1', 'features.notesDetail2', 'features.notesDetail3'],
    tintBg: 'bg-warning/10',
    tintText: 'text-warning',
  },
  {
    icon: Globe,
    titleKey: 'features.publishTitle',
    descKey: 'features.publishDesc',
    detailKeys: ['features.publishDetail1', 'features.publishDetail2', 'features.publishDetail3'],
    tintBg: 'bg-brand-light/10',
    tintText: 'text-brand-light',
  },
];

const compareLinks = [
  { label: 'Notion', href: '/compare/notion' },
  { label: 'Obsidian', href: '/compare/obsidian' },
  { label: 'Manus', href: '/compare/manus' },
  { label: 'Cowork', href: '/compare/cowork' },
  { label: 'OpenClaw', href: '/compare/openclaw' },
];

function FeaturesPage() {
  const locale = useLocale();
  const downloadHref = getPageHref('/download', locale);
  const title = t('meta.features.title', locale);
  const description = t('meta.features.description', locale);
  const heroRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up' });
  const featuresRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 150 });

  return (
    <>
      <JsonLd
        data={createWebPageSchema({
          name: title,
          description,
          url: getCanonicalUrl('/features', locale),
        })}
      />
      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="relative px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'var(--gradient-hero-glow)' }}
          />
          <div ref={heroRef} className="container relative mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight">
              {t('features.title', locale)}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('features.subtitle', locale)}
            </p>
          </div>
        </section>

        {/* Features — alternating layout */}
        <section className="px-4 sm:px-6 py-16">
          <div ref={featuresRef} className="container mx-auto max-w-5xl space-y-8">
            {featureConfigs.map((feature, index) => {
              const Icon = feature.icon;
              const isReversed = index % 2 === 1;
              return (
                <div
                  key={feature.titleKey}
                  data-reveal-item
                  className="bg-card rounded-2xl p-8 sm:p-10 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div
                    className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8`}
                  >
                    <div className="flex-1">
                      <div
                        className={`w-12 h-12 rounded-xl ${feature.tintBg} flex items-center justify-center mb-5`}
                      >
                        <Icon size={24} className={feature.tintText} />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
                        {t(feature.titleKey, locale)}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        {t(feature.descKey, locale)}
                      </p>
                      <ul className="space-y-2">
                        {feature.detailKeys.map((detailKey) => (
                          <li
                            key={detailKey}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span
                              className={`mt-1.5 w-1.5 h-1.5 rounded-full ${feature.tintBg.replace('/10', '')} flex-shrink-0`}
                            />
                            {t(detailKey, locale)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Abstract UI mockup */}
                    <div className="flex-1">
                      <div className="aspect-[4/3] rounded-xl bg-background border border-border-muted overflow-hidden">
                        <div className="h-full flex flex-col p-3 gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-destructive/30" />
                            <div className="w-2 h-2 rounded-full bg-warning/30" />
                            <div className="w-2 h-2 rounded-full bg-success/30" />
                          </div>
                          <div className="flex-1 flex gap-2">
                            <div className="w-1/4 rounded-lg bg-muted/50" />
                            <div className="flex-1 space-y-2">
                              <div className="h-2 rounded bg-muted/60 w-3/4" />
                              <div className="h-2 rounded bg-muted/40 w-1/2" />
                              <div className="h-2 rounded bg-muted/30 w-2/3" />
                              <div className="h-2 rounded bg-muted/20 w-1/3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Compare */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-4 tracking-tight">
              {t('features.compareTitle', locale)}
            </h2>
            <p className="text-muted-foreground text-center mb-8 max-w-xl mx-auto">
              {t('features.compareDesc', locale)}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {compareLinks.map((link) => (
                <Link
                  key={link.label}
                  to={getPageHref(link.href, locale)}
                  className="group inline-flex items-center gap-2 px-5 py-3 bg-card rounded-xl shadow-xs text-sm font-medium text-muted-foreground hover:text-foreground hover:shadow-sm transition-all"
                >
                  {t('compare.summaryPrefix', locale)} {link.label}
                  <ArrowRight
                    size={14}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative px-4 sm:px-6 py-16 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(500px circle at 50% 50%, rgba(124, 92, 252, 0.04), transparent 70%)',
            }}
          />
          <div className="container relative mx-auto max-w-4xl text-center">
            <div className="bg-card rounded-2xl p-8 sm:p-12 shadow-sm">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
                {t('features.ctaTitle', locale)}
              </h2>
              <p className="text-muted-foreground mb-8">{t('features.ctaDesc', locale)}</p>
              <Link
                to={downloadHref}
                className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-xl font-medium text-lg hover:bg-foreground/90 transition-all hover:shadow-lg"
                data-track-cta="features-download"
              >
                {t('features.ctaButton', locale)}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
