'use client';

import { createFileRoute, Link } from '@tanstack/react-router';
import { getCanonicalUrl, getPageMeta } from '@/lib/seo';
import { JsonLd, createWebPageSchema } from '@/components/seo/JsonLd';
import { Search, PenLine, Brain, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { resolveLocale, t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';

export const Route = createFileRoute('/{-$locale}/use-cases')({
  head: ({ params }) => {
    const locale = resolveLocale(params.locale);
    return getPageMeta({
      pageId: 'use-cases',
      locale,
      title: t('meta.useCases.title', locale),
      description: t('meta.useCases.description', locale),
    });
  },
  component: UseCasesPage,
});

interface UseCase {
  id: string;
  icon: LucideIcon;
  titleKey: string;
  headlineKey: string;
  descriptionKey: string;
  stepKeys: string[];
  relatedPages: { labelKey: string; href: string }[];
  tintBg: string;
  tintText: string;
}

const useCases: UseCase[] = [
  {
    id: 'research',
    icon: Search,
    titleKey: 'useCases.research.title',
    headlineKey: 'useCases.research.headline',
    descriptionKey: 'useCases.research.description',
    stepKeys: ['useCases.research.step1', 'useCases.research.step2', 'useCases.research.step3'],
    relatedPages: [
      { labelKey: 'page.aiNoteTakingApp', href: '/ai-note-taking-app' },
      { labelKey: 'page.secondBrainApp', href: '/second-brain-app' },
    ],
    tintBg: 'bg-brand/10',
    tintText: 'text-brand',
  },
  {
    id: 'writing',
    icon: PenLine,
    titleKey: 'useCases.writing.title',
    headlineKey: 'useCases.writing.headline',
    descriptionKey: 'useCases.writing.description',
    stepKeys: ['useCases.writing.step1', 'useCases.writing.step2', 'useCases.writing.step3'],
    relatedPages: [
      { labelKey: 'page.notesToWebsite', href: '/notes-to-website' },
      { labelKey: 'page.localFirstAiNotes', href: '/local-first-ai-notes' },
    ],
    tintBg: 'bg-success/10',
    tintText: 'text-success',
  },
  {
    id: 'pkm',
    icon: Brain,
    titleKey: 'useCases.pkm.title',
    headlineKey: 'useCases.pkm.headline',
    descriptionKey: 'useCases.pkm.description',
    stepKeys: ['useCases.pkm.step1', 'useCases.pkm.step2', 'useCases.pkm.step3'],
    relatedPages: [
      { labelKey: 'page.secondBrainApp', href: '/second-brain-app' },
      { labelKey: 'page.agentWorkspace', href: '/agent-workspace' },
    ],
    tintBg: 'bg-warning/10',
    tintText: 'text-warning',
  },
  {
    id: 'digital-garden',
    icon: Sprout,
    titleKey: 'useCases.garden.title',
    headlineKey: 'useCases.garden.headline',
    descriptionKey: 'useCases.garden.description',
    stepKeys: ['useCases.garden.step1', 'useCases.garden.step2', 'useCases.garden.step3'],
    relatedPages: [
      { labelKey: 'page.digitalGardenApp', href: '/digital-garden-app' },
      { labelKey: 'page.notesToWebsite', href: '/notes-to-website' },
    ],
    tintBg: 'bg-brand-light/10',
    tintText: 'text-brand-light',
  },
];

function UseCasesPage() {
  const locale = useLocale();
  const downloadHref = getPageHref('/download', locale);
  const title = t('meta.useCases.title', locale);
  const description = t('meta.useCases.description', locale);
  const heroRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up' });
  const casesRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 150 });

  return (
    <>
      <JsonLd
        data={createWebPageSchema({
          name: title,
          description,
          url: getCanonicalUrl('/use-cases', locale),
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
              {t('useCases.title', locale)}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('useCases.subtitle', locale)}
            </p>
          </div>
        </section>

        {/* Use Cases */}
        <section className="px-4 sm:px-6 py-8">
          <div ref={casesRef} className="container mx-auto max-w-5xl space-y-10">
            {useCases.map((uc) => {
              const Icon = uc.icon;
              return (
                <div key={uc.id} id={uc.id} data-reveal-item className="scroll-mt-24">
                  <div className="bg-card rounded-2xl p-8 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
                    <div
                      className={`w-12 h-12 rounded-xl ${uc.tintBg} flex items-center justify-center mb-5`}
                    >
                      <Icon size={24} className={uc.tintText} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 tracking-tight">
                      {t(uc.titleKey, locale)}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-6">
                      {t(uc.headlineKey, locale)}
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {t(uc.descriptionKey, locale)}
                    </p>

                    {/* Steps */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-tertiary uppercase tracking-wider mb-3">
                        {t('useCases.howItWorks', locale)}
                      </h3>
                      <ol className="space-y-3">
                        {uc.stepKeys.map((stepKey, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm text-muted-foreground"
                          >
                            <span
                              className={`w-6 h-6 rounded-full ${uc.tintBg} ${uc.tintText} text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5`}
                            >
                              {i + 1}
                            </span>
                            {t(stepKey, locale)}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Related SEO pages */}
                    {uc.relatedPages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {uc.relatedPages.map((page) => (
                          <Link
                            key={page.labelKey}
                            to={getPageHref(page.href, locale)}
                            className="text-xs font-medium px-3 py-1.5 rounded-full bg-background border border-border-muted text-tertiary hover:text-muted-foreground hover:border-border transition-colors"
                          >
                            {t(page.labelKey, locale)}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
            <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">
              {t('useCases.ctaTitle', locale)}
            </h2>
            <p className="text-muted-foreground mb-8">{t('useCases.ctaDesc', locale)}</p>
            <Link
              to={downloadHref}
              className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-xl font-medium text-lg hover:bg-foreground/90 transition-all hover:shadow-lg"
              data-track-cta="use-cases-download"
            >
              {t('cta.downloadFree', locale)}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
