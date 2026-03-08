'use client';

import { createFileRoute, Link } from '@tanstack/react-router';
import { getCanonicalUrl, getPageMeta } from '@/lib/seo';
import { JsonLd, createWebPageSchema } from '@/components/seo/JsonLd';
import { Bot, NotebookPen, Shield, Globe, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { resolveLocale, t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

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
}

const featureConfigs: Feature[] = [
  {
    icon: Bot,
    titleKey: 'features.agentTitle',
    descKey: 'features.agentDesc',
    detailKeys: ['features.agentDetail1', 'features.agentDetail2', 'features.agentDetail3'],
  },
  {
    icon: NotebookPen,
    titleKey: 'features.memoryTitle',
    descKey: 'features.memoryDesc',
    detailKeys: ['features.memoryDetail1', 'features.memoryDetail2', 'features.memoryDetail3'],
  },
  {
    icon: Shield,
    titleKey: 'features.notesTitle',
    descKey: 'features.notesDesc',
    detailKeys: ['features.notesDetail1', 'features.notesDetail2', 'features.notesDetail3'],
  },
  {
    icon: Globe,
    titleKey: 'features.publishTitle',
    descKey: 'features.publishDesc',
    detailKeys: ['features.publishDetail1', 'features.publishDetail2', 'features.publishDetail3'],
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
        <section className="px-4 sm:px-6 py-16 sm:py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-mory-text-primary mb-6">
              {t('features.title', locale)}
            </h1>
            <p className="text-lg sm:text-xl text-mory-text-secondary max-w-2xl mx-auto">
              {t('features.subtitle', locale)}
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-5xl space-y-12">
            {featureConfigs.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.titleKey}
                  className="bg-mory-paper rounded-3xl p-8 sm:p-10 border border-mory-border"
                >
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-mory-orange/10 flex items-center justify-center mb-5">
                        <Icon size={24} className="text-mory-orange" />
                      </div>
                      <h2 className="font-serif text-2xl font-bold text-mory-text-primary mb-3">
                        {t(feature.titleKey, locale)}
                      </h2>
                      <p className="text-mory-text-secondary leading-relaxed mb-4">
                        {t(feature.descKey, locale)}
                      </p>
                      <ul className="space-y-2">
                        {feature.detailKeys.map((detailKey) => (
                          <li
                            key={detailKey}
                            className="flex items-start gap-2 text-sm text-mory-text-secondary"
                          >
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mory-orange flex-shrink-0" />
                            {t(detailKey, locale)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Visual placeholder */}
                    <div className="flex-1">
                      <div className="aspect-[4/3] rounded-2xl bg-mory-bg border border-mory-border-light flex items-center justify-center">
                        <span className="text-xs text-mory-text-tertiary">
                          {t('home.pillars.screenshotPlaceholder', locale)}
                        </span>
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
            <h2 className="font-serif text-2xl font-bold text-mory-text-primary text-center mb-4">
              {t('features.compareTitle', locale)}
            </h2>
            <p className="text-mory-text-secondary text-center mb-8 max-w-xl mx-auto">
              {t('features.compareDesc', locale)}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {compareLinks.map((link) => (
                <Link
                  key={link.label}
                  to={getPageHref(link.href, locale)}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-mory-paper rounded-xl border border-mory-border text-sm font-medium text-mory-text-secondary hover:text-mory-text-primary hover:border-mory-orange/30 transition-all"
                >
                  {t('compare.summaryPrefix', locale)} {link.label}
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="bg-mory-paper rounded-3xl p-8 sm:p-12 border border-mory-border">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-mory-text-primary mb-4">
                {t('features.ctaTitle', locale)}
              </h2>
              <p className="text-mory-text-secondary mb-8">{t('features.ctaDesc', locale)}</p>
              <Link
                to={downloadHref}
                className="inline-flex items-center gap-2 bg-mory-text-primary text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-black transition-all"
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
