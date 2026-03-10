/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Homepage features grid — 6 compact capability cards replacing pillars/workflow/telegram/publishing
 */

'use client';

import { Bot, HardDrive, Brain, Globe, MessageCircle, Blocks } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';

const FEATURES = [
  { icon: Bot, titleKey: 'home.features.agentTitle', descKey: 'home.features.agentDesc' },
  { icon: HardDrive, titleKey: 'home.features.notesTitle', descKey: 'home.features.notesDesc' },
  { icon: Brain, titleKey: 'home.features.memoryTitle', descKey: 'home.features.memoryDesc' },
  { icon: Globe, titleKey: 'home.features.publishTitle', descKey: 'home.features.publishDesc' },
  {
    icon: MessageCircle,
    titleKey: 'home.features.telegramTitle',
    descKey: 'home.features.telegramDesc',
  },
  { icon: Blocks, titleKey: 'home.features.openTitle', descKey: 'home.features.openDesc' },
] as const;

const TINTS = [
  { bg: 'bg-brand/10', text: 'text-brand' },
  { bg: 'bg-success/10', text: 'text-success' },
  { bg: 'bg-brand-light/15', text: 'text-brand-light' },
  { bg: 'bg-warning/10', text: 'text-warning' },
  { bg: 'bg-brand/10', text: 'text-brand' },
  { bg: 'bg-success/10', text: 'text-success' },
];

export function FeaturesSection() {
  const locale = useLocale();
  const headingRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up' });
  const gridRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 80 });

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div ref={headingRef} className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            {t('home.features.title', locale)}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            {t('home.features.subtitle', locale)}
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            const tint = TINTS[i % TINTS.length]!;
            return (
              <div
                key={feature.titleKey}
                data-reveal-item
                className="rounded-2xl bg-card p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${tint.bg} flex items-center justify-center mb-4`}
                >
                  <Icon size={20} className={tint.text} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t(feature.titleKey, locale)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(feature.descKey, locale)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
