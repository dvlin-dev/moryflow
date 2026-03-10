/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Feature section — Local-first + BYOK + Open Source trust cards
 */

'use client';

import { HardDrive, Key, Code } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';

const CARDS = [
  { icon: HardDrive, titleKey: 'home.local.dataTitle', descKey: 'home.local.dataDesc' },
  { icon: Key, titleKey: 'home.local.byokTitle', descKey: 'home.local.byokDesc' },
  { icon: Code, titleKey: 'home.local.ossTitle', descKey: 'home.local.ossDesc' },
] as const;

export function FeatureLocal() {
  const locale = useLocale();
  const headingRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up' });
  const gridRef = useScrollRevealGroup<HTMLDivElement>({ animation: 'scale-up', stagger: 80 });

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div ref={headingRef} className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            {t('home.local.title', locale)}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            {t('home.local.subtitle', locale)}
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.titleKey}
                data-reveal-item
                className="rounded-2xl bg-card p-8 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div
                  className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center mb-5"
                  aria-label={t(card.titleKey, locale)}
                >
                  <Icon size={24} className="text-brand" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t(card.titleKey, locale)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(card.descKey, locale)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
