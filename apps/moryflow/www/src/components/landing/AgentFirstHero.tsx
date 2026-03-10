/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent-first hero — Inter display title + gradient accent + OS-aware CTA
 */

'use client';

import { Link } from '@tanstack/react-router';
import { Download, Star } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { usePlatformDetection } from '@/lib/platform';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useGitHubStars, formatStarCount } from '@/hooks/useGitHubStars';

const GITHUB_URL = 'https://github.com/dvlin-dev/moryflow';

export function AgentFirstHero() {
  const platform = usePlatformDetection();
  const locale = useLocale();
  const downloadHref = getPageHref('/download', locale);
  const stars = useGitHubStars();
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

        {/* CTA */}
        <div ref={ctaRef} className="flex flex-col items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
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
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-all hover:shadow-md hover:border-brand/30"
            >
              <Star size={16} className="text-brand" />
              {t('home.hero.starOnGithub', locale)}
              {stars !== null && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand font-semibold">
                  {formatStarCount(stars)}
                </span>
              )}
            </a>
          </div>
          <span className="text-sm text-tertiary">{t('home.hero.freeToStart', locale)}</span>
        </div>

        {/* Product screenshot placeholder — to be replaced with a real image */}
      </div>
    </section>
  );
}
