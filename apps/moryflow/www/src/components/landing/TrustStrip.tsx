/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Trust strip — instant credibility bar below Hero
 */

'use client';

import { Shield, HardDrive, Blocks, Star } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { useGitHubStars, formatStarCount } from '@/hooks/useGitHubStars';

export function TrustStrip() {
  const locale = useLocale();
  const stars = useGitHubStars();

  const items = [
    ...(stars !== null
      ? [
          {
            icon: Star,
            label: t('home.trust.stars', locale).replace('{count}', formatStarCount(stars)),
          },
        ]
      : []),
    { icon: Shield, label: t('home.trust.openSource', locale) },
    { icon: HardDrive, label: t('home.trust.localFirst', locale) },
    { icon: Blocks, label: t('home.trust.providers', locale) },
  ];

  return (
    <section className="py-6 sm:py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <span key={item.label} className="inline-flex items-center gap-2 text-sm text-tertiary">
              <Icon size={16} className="shrink-0" />
              {item.label}
            </span>
          );
        })}
      </div>
    </section>
  );
}
