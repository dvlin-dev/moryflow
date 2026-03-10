/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Social proof section — community stats (replaces placeholder testimonials)
 */

'use client';

import { Github, Download, Globe } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { useScrollRevealGroup } from '@/hooks/useScrollReveal';

const stats = [
  { icon: Github, labelKey: 'home.socialProof.openSource', value: 'Open Source' },
  { icon: Download, labelKey: 'home.socialProof.beta', value: 'Public Beta' },
  { icon: Globe, labelKey: 'home.socialProof.platforms', value: 'macOS' },
];

export function SocialProofSection() {
  const locale = useLocale();
  const ref = useScrollRevealGroup<HTMLDivElement>({ stagger: 100, animation: 'fade-up' });

  return (
    <section className="py-14 sm:py-16 px-4 sm:px-6">
      <div className="container mx-auto max-w-3xl text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
          {t('home.socialProof.title', locale)}
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-10">
          {t('home.socialProof.subtitle', locale)}
        </p>

        <div ref={ref} className="flex flex-wrap justify-center gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.labelKey}
                data-reveal-item
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-xs"
              >
                <Icon size={20} className="text-brand" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-tertiary">{t(stat.labelKey, locale)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
