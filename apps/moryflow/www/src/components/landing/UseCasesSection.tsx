/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Use cases card grid — hover elevation + gradient accent bar + differentiated tints
 */

'use client';

import { Link } from '@tanstack/react-router';
import { Search, PenLine, Brain, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';

interface UseCase {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  capabilityKey: string;
  anchor: string;
  tintBg: string;
  tintText: string;
}

const useCases: UseCase[] = [
  {
    icon: Search,
    titleKey: 'home.useCases.researchTitle',
    descKey: 'home.useCases.researchDesc',
    capabilityKey: 'home.useCases.researchCapability',
    anchor: '#research',
    tintBg: 'bg-brand/10',
    tintText: 'text-brand',
  },
  {
    icon: PenLine,
    titleKey: 'home.useCases.writingTitle',
    descKey: 'home.useCases.writingDesc',
    capabilityKey: 'home.useCases.writingCapability',
    anchor: '#writing',
    tintBg: 'bg-success/10',
    tintText: 'text-success',
  },
  {
    icon: Brain,
    titleKey: 'home.useCases.pkmTitle',
    descKey: 'home.useCases.pkmDesc',
    capabilityKey: 'home.useCases.pkmCapability',
    anchor: '#pkm',
    tintBg: 'bg-warning/10',
    tintText: 'text-warning',
  },
  {
    icon: Sprout,
    titleKey: 'home.useCases.gardenTitle',
    descKey: 'home.useCases.gardenDesc',
    capabilityKey: 'home.useCases.gardenCapability',
    anchor: '#digital-garden',
    tintBg: 'bg-brand-light/10',
    tintText: 'text-brand-light',
  },
];

export function UseCasesSection() {
  const locale = useLocale();
  const useCasesHref = getPageHref('/use-cases', locale);
  const headingRef = useScrollReveal<HTMLHeadingElement>({ animation: 'fade-up' });
  const subtitleRef = useScrollReveal<HTMLParagraphElement>({ animation: 'fade-up', delay: 80 });
  const gridRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 100 });

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <h2
          ref={headingRef}
          className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-4 tracking-tight"
        >
          {t('home.useCases.title', locale)}
        </h2>
        <p ref={subtitleRef} className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          {t('useCases.subtitle', locale)}
        </p>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {useCases.map((uc) => {
            const Icon = uc.icon;
            return (
              <Link
                key={uc.titleKey}
                to={`${useCasesHref}${uc.anchor}`}
                data-reveal-item
                className="group relative bg-card rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
              >
                {/* Hover gradient accent bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand to-brand-light opacity-0 group-hover:opacity-100 transition-opacity" />

                <div
                  className={`w-10 h-10 rounded-xl ${uc.tintBg} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}
                >
                  <Icon size={20} className={uc.tintText} />
                </div>
                <div className="mb-3 inline-flex rounded-full border border-border-muted bg-background px-3 py-1 text-xs font-medium text-tertiary">
                  {t(uc.capabilityKey, locale)}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{t(uc.titleKey, locale)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
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
