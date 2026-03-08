/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent-first hero section — title + subtitle + OS-aware download CTA + product screenshot placeholder
 */

'use client';

import { Link } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { usePlatformDetection } from '@/lib/platform';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

export function AgentFirstHero() {
  const platform = usePlatformDetection();
  const locale = useLocale();
  const downloadHref = getPageHref('/download', locale);

  const ctaLabel =
    platform === 'mac'
      ? t('home.hero.ctaMac', locale)
      : platform === 'win'
        ? t('home.hero.ctaWin', locale)
        : t('home.hero.cta', locale);

  const altLinks =
    platform === 'mac'
      ? [{ label: t('home.hero.altWin', locale), href: downloadHref }]
      : platform === 'win'
        ? [{ label: t('home.hero.altMac', locale), href: downloadHref }]
        : [
            { label: 'macOS', href: downloadHref },
            { label: 'Windows', href: downloadHref },
          ];

  return (
    <section className="pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl text-center">
        {/* Title */}
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-mory-text-primary mb-6 leading-tight">
          {t('home.hero.titlePrefix', locale)}{' '}
          <span className="text-mory-orange">{t('home.hero.titleAccent', locale)}</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-mory-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('home.hero.subtitle', locale)}
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 mb-16">
          <Button
            asChild
            size="lg"
            className="bg-mory-text-primary text-white hover:bg-black rounded-xl text-base font-medium px-8 py-3 cursor-pointer"
            data-track-cta="hero-download"
          >
            <Link to={downloadHref}>
              <Download size={18} />
              {ctaLabel}
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm text-mory-text-tertiary">
            {altLinks.map((alt) => (
              <Link
                key={alt.label}
                to={alt.href}
                className="hover:text-mory-text-secondary transition-colors underline underline-offset-2"
              >
                {alt.label}
              </Link>
            ))}
            <span>&middot;</span>
            <span>{t('home.hero.freeBeta', locale)}</span>
          </div>
        </div>

        {/* Product Screenshot Placeholder */}
        <div className="relative mx-auto max-w-4xl">
          <div className="aspect-[16/10] rounded-2xl border-2 border-mory-border bg-mory-paper flex items-center justify-center shadow-mory-lg">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-mory-orange/10 flex items-center justify-center">
                <img src="/logo.svg" alt="" className="w-8 h-8" />
              </div>
              <p className="text-sm text-mory-text-tertiary">
                {t('home.hero.screenshotPlaceholder', locale)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
