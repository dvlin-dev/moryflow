/**
 * [PROPS]: { title, description }
 * [EMITS]: None
 * [POS]: Dual CTA section for GEO articles — GitHub Star + Download
 */

'use client';

import { Link } from '@tanstack/react-router';
import { Download, Star } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useGitHubStars, formatStarCount } from '@/hooks/useGitHubStars';

interface GeoCtaSectionProps {
  title: string;
  description: string;
}

export function GeoCtaSection({ title, description }: GeoCtaSectionProps) {
  const locale = useLocale();
  const stars = useGitHubStars();

  return (
    <section className="relative px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(500px circle at 50% 50%, rgba(124, 92, 252, 0.04), transparent 70%)',
        }}
      />
      <div className="container relative mx-auto max-w-3xl text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
          {title}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">{description}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="rounded-xl text-base font-medium px-8 py-3 border border-border bg-card text-foreground hover:bg-card hover:border-brand/30 transition-all hover:shadow-lg"
            data-track-cta="geo-github-star"
          >
            <a
              href="https://github.com/dvlin-dev/moryflow"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Star size={18} className="text-brand" />
              {t('home.hero.starOnGithub', locale)}
              {stars !== null && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand font-semibold">
                  {formatStarCount(stars)}
                </span>
              )}
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            className="rounded-xl text-base font-medium px-8 py-3 bg-foreground text-background hover:bg-foreground/90 transition-all hover:shadow-lg"
            data-track-cta="geo-download"
          >
            <Link to={getPageHref('/download', locale)}>
              <Download size={18} />
              {t('cta.downloadMoryflow', locale)}
            </Link>
          </Button>
        </div>
        <p className="mt-3 text-sm text-tertiary">{t('home.hero.freeToStart', locale)}</p>
      </div>
    </section>
  );
}
