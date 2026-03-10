/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Final CTA section — Download + community links + version info
 */

'use client';

import { Link } from '@tanstack/react-router';
import { Download, Star, MessageSquare, ExternalLink } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useGitHubStars, formatStarCount } from '@/hooks/useGitHubStars';
import { useDownload } from '@/hooks/useDownload';

const GITHUB_URL = 'https://github.com/dvlin-dev/moryflow';
const DISCORD_URL = 'https://discord.gg/cyBRZa9zJr';

export function DownloadCTA() {
  const locale = useLocale();
  const downloadHref = getPageHref('/download', locale);
  const stars = useGitHubStars();
  const { version, releaseNotesUrl, isLoading } = useDownload();
  const headingRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up' });
  const ctaRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', delay: 150 });

  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6 overflow-hidden">
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(600px circle at 50% 50%, rgba(124, 92, 252, 0.05), transparent 70%)',
        }}
      />

      <div className="container relative mx-auto max-w-3xl text-center">
        <div ref={headingRef}>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            {t('downloadCta.title', locale)}
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            {t('downloadCta.desc', locale)}
          </p>
        </div>

        <div ref={ctaRef} className="space-y-6">
          {/* Primary: Download */}
          <div>
            <Button
              asChild
              size="lg"
              className="bg-foreground text-background hover:bg-foreground/90 rounded-xl text-base font-medium px-8 py-3 cursor-pointer transition-all hover:shadow-lg"
              data-track-cta="final-download"
            >
              <Link to={downloadHref}>
                <Download size={18} />
                {t('cta.downloadMoryflow', locale)}
              </Link>
            </Button>
          </div>

          {/* Secondary: Community links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:shadow-md hover:border-brand/30"
            >
              <Star size={16} className="text-brand" />
              {t('home.community.joinGithub', locale)}
              {stars !== null && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand font-semibold">
                  {formatStarCount(stars)}
                </span>
              )}
            </a>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:shadow-md hover:border-brand/30"
            >
              <MessageSquare size={16} className="text-brand" />
              {t('home.community.joinDiscord', locale)}
            </a>
          </div>

          {/* Meta: version + release notes */}
          <div className="flex items-center justify-center gap-3 text-sm text-tertiary">
            <span>{t('home.hero.freeToStart', locale)}</span>
            {!isLoading && version !== '…' && (
              <>
                <span>&middot;</span>
                <span>v{version}</span>
                <span>&middot;</span>
                <a
                  href={releaseNotesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-foreground hover:text-brand transition-colors"
                >
                  <ExternalLink size={14} />
                  {t('download.releaseNotes', locale)}
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
