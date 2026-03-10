/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent-first hero — Inter display title + gradient accent + OS-aware CTA + product screenshot placeholder
 */

'use client';

import { Link } from '@tanstack/react-router';
import { Download, Monitor } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { usePlatformDetection } from '@/lib/platform';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function AgentFirstHero() {
  const platform = usePlatformDetection();
  const locale = useLocale();
  const downloadHref = getPageHref('/download', locale);
  const titleRef = useScrollReveal<HTMLHeadingElement>({ animation: 'fade-up', duration: 700 });
  const subtitleRef = useScrollReveal<HTMLParagraphElement>({
    animation: 'fade-up',
    delay: 100,
    duration: 700,
  });
  const ctaRef = useScrollReveal<HTMLDivElement>({
    animation: 'fade-up',
    delay: 200,
    duration: 700,
  });
  const screenshotRef = useScrollReveal<HTMLDivElement>({
    animation: 'fade-up',
    delay: 300,
    duration: 700,
  });

  const ctaLabel = platform === 'mac' ? t('home.hero.ctaMac', locale) : t('home.hero.cta', locale);

  return (
    <section className="relative px-4 pt-32 pb-16 sm:px-6 sm:pt-40 sm:pb-24 overflow-hidden">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--gradient-hero-glow)' }}
      />

      <div className="container relative mx-auto max-w-6xl text-center">
        {/* Title */}
        <h1
          ref={titleRef}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-6 leading-[1.1] tracking-tight"
        >
          {t('home.hero.titlePrefix', locale)}
          <br />
          <span className="bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">
            {t('home.hero.titleAccent', locale)}
          </span>
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          {t('home.hero.subtitle', locale)}
        </p>

        {/* CTA — Download only, GitHub star moved to Trust Strip */}
        <div ref={ctaRef} className="flex flex-col items-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-foreground text-background hover:bg-foreground/90 rounded-xl text-base font-medium px-8 py-3 cursor-pointer transition-all hover:shadow-lg"
            data-track-cta="hero-download"
          >
            <Link to={downloadHref}>
              <Download size={18} />
              {ctaLabel}
            </Link>
          </Button>
          <span className="text-sm text-tertiary">{t('home.hero.freeToStart', locale)}</span>
        </div>

        {/* Product screenshot placeholder */}
        <div
          ref={screenshotRef}
          className="mt-16 mx-auto max-w-4xl rounded-2xl bg-card border border-border/50 aspect-[16/10] flex flex-col items-center justify-center gap-4 p-8"
        >
          <Monitor size={48} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Screenshot: Moryflow workspace overview</p>
        </div>
      </div>
    </section>
  );
}
