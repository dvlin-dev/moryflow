'use client';

import { createFileRoute, Link } from '@tanstack/react-router';
import { getCanonicalUrl, getPageMeta } from '@/lib/seo';
import { JsonLd, createWebPageSchema } from '@/components/seo/JsonLd';
import { Search, PenLine, Brain, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { resolveLocale, t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

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
  },
];

function UseCasesPage() {
  const locale = useLocale();
  const downloadHref = getPageHref('/download', locale);
  const title = t('meta.useCases.title', locale);
  const description = t('meta.useCases.description', locale);

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
        <section className="px-4 sm:px-6 py-16 sm:py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-mory-text-primary mb-6">
              {t('useCases.title', locale)}
            </h1>
            <p className="text-lg sm:text-xl text-mory-text-secondary max-w-2xl mx-auto">
              {t('useCases.subtitle', locale)}
            </p>
          </div>
        </section>

        {/* Use Cases */}
        <section className="px-4 sm:px-6 py-8">
          <div className="container mx-auto max-w-5xl space-y-16">
            {useCases.map((uc) => {
              const Icon = uc.icon;
              return (
                <div key={uc.id} id={uc.id} className="scroll-mt-24">
                  <div className="bg-mory-paper rounded-3xl p-8 sm:p-10 border border-mory-border">
                    <div className="w-12 h-12 rounded-2xl bg-mory-orange/10 flex items-center justify-center mb-5">
                      <Icon size={24} className="text-mory-orange" />
                    </div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-mory-text-primary mb-2">
                      {t(uc.titleKey, locale)}
                    </h2>
                    <p className="text-lg text-mory-text-secondary mb-6">
                      {t(uc.headlineKey, locale)}
                    </p>
                    <p className="text-mory-text-secondary leading-relaxed mb-6">
                      {t(uc.descriptionKey, locale)}
                    </p>

                    {/* Steps */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-mory-text-tertiary uppercase tracking-wider mb-3">
                        {t('useCases.howItWorks', locale)}
                      </h3>
                      <ol className="space-y-3">
                        {uc.stepKeys.map((stepKey, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm text-mory-text-secondary"
                          >
                            <span className="w-6 h-6 rounded-full bg-mory-orange/10 text-mory-orange text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
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
                            className="text-xs font-medium px-3 py-1.5 rounded-full bg-mory-bg border border-mory-border-light text-mory-text-tertiary hover:text-mory-text-secondary hover:border-mory-border transition-colors"
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
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="font-serif text-3xl font-bold text-mory-text-primary mb-4">
              {t('useCases.ctaTitle', locale)}
            </h2>
            <p className="text-mory-text-secondary mb-8">{t('useCases.ctaDesc', locale)}</p>
            <Link
              to={downloadHref}
              className="inline-flex items-center gap-2 bg-mory-text-primary text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-black transition-all"
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
