/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent-first hero section — title + subtitle + OS-aware download CTA + desktop-only interactive workspace demo
 */

'use client';

import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { usePlatformDetection } from '@/lib/platform';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { WorkspaceDemoPreview, WorkspaceDemoShell } from './workspace-demo';

type DesktopDemoMode = 'preview' | 'interactive' | 'hidden';

export function AgentFirstHero() {
  const platform = usePlatformDetection();
  const locale = useLocale();
  const downloadHref = getPageHref('/download', locale);
  const [desktopDemoMode, setDesktopDemoMode] = useState<DesktopDemoMode>('preview');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    // Start with an SSR-safe preview so the desktop hero has stable first paint,
    // then swap to the interactive shell only when the viewport is large enough.
    const sync = () => setDesktopDemoMode(mediaQuery.matches ? 'interactive' : 'hidden');
    sync();

    mediaQuery.addEventListener?.('change', sync);
    return () => mediaQuery.removeEventListener?.('change', sync);
  }, []);

  const ctaLabel = platform === 'mac' ? t('home.hero.ctaMac', locale) : t('home.hero.cta', locale);

  const altLinks =
    platform === 'mac'
      ? [{ label: t('home.hero.altWinSoon', locale), href: downloadHref }]
      : platform === 'win'
        ? [{ label: t('home.hero.altMac', locale), href: downloadHref }]
        : [
            { label: 'macOS', href: downloadHref },
            { label: t('home.hero.altWinSoon', locale), href: downloadHref },
          ];

  return (
    <section className="px-4 pt-32 pb-16 sm:px-6 sm:pt-40 sm:pb-24">
      <div className="container mx-auto max-w-6xl text-center">
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

        <div className="hidden min-h-[720px] lg:block">
          {desktopDemoMode === 'preview' ? <WorkspaceDemoPreview /> : null}
          {desktopDemoMode === 'interactive' ? <WorkspaceDemoShell /> : null}
        </div>
      </div>
    </section>
  );
}
