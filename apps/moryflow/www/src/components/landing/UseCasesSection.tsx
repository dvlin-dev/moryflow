/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Use cases card grid — links to /use-cases anchors
 */

'use client';

import { Link } from '@tanstack/react-router';
import { Search, PenLine, Brain, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

interface UseCase {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  capabilityKey: string;
  anchor: string;
}

const useCases: UseCase[] = [
  {
    icon: Search,
    titleKey: 'home.useCases.researchTitle',
    descKey: 'home.useCases.researchDesc',
    capabilityKey: 'home.useCases.researchCapability',
    anchor: '#research',
  },
  {
    icon: PenLine,
    titleKey: 'home.useCases.writingTitle',
    descKey: 'home.useCases.writingDesc',
    capabilityKey: 'home.useCases.writingCapability',
    anchor: '#writing',
  },
  {
    icon: Brain,
    titleKey: 'home.useCases.pkmTitle',
    descKey: 'home.useCases.pkmDesc',
    capabilityKey: 'home.useCases.pkmCapability',
    anchor: '#pkm',
  },
  {
    icon: Sprout,
    titleKey: 'home.useCases.gardenTitle',
    descKey: 'home.useCases.gardenDesc',
    capabilityKey: 'home.useCases.gardenCapability',
    anchor: '#digital-garden',
  },
];

export function UseCasesSection() {
  const locale = useLocale();
  const useCasesHref = getPageHref('/use-cases', locale);

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-mory-text-primary text-center mb-4">
          {t('home.useCases.title', locale)}
        </h2>
        <p className="text-mory-text-secondary text-center mb-12 max-w-2xl mx-auto">
          {t('useCases.subtitle', locale)}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {useCases.map((uc) => {
            const Icon = uc.icon;
            return (
              <Link
                key={uc.titleKey}
                to={`${useCasesHref}${uc.anchor}`}
                className="group bg-mory-paper rounded-2xl p-6 border border-mory-border hover:border-mory-orange/30 hover:shadow-mory-md transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-mory-orange/10 flex items-center justify-center mb-4 group-hover:bg-mory-orange/20 transition-colors">
                  <Icon size={20} className="text-mory-orange" />
                </div>
                <div className="mb-3 inline-flex rounded-full border border-mory-border-light bg-mory-bg px-3 py-1 text-xs font-medium text-mory-text-tertiary">
                  {t(uc.capabilityKey, locale)}
                </div>
                <h3 className="font-serif text-lg font-bold text-mory-text-primary mb-2">
                  {t(uc.titleKey, locale)}
                </h3>
                <p className="text-sm text-mory-text-secondary leading-relaxed">
                  {t(uc.descKey, locale)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
