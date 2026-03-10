/**
 * [PROPS]: { title, description, buttonLabel, subtitle, trackId }
 * [EMITS]: None
 * [POS]: Reusable bottom download CTA section with subtle brand glow
 */

'use client';

import { Link } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { useLocale } from '@/routes/{-$locale}/route';
import { getDownloadCtaDefaults } from '@/lib/marketing-copy';
import { getPageHref } from '@/lib/site-pages';

interface DownloadCtaSectionProps {
  title: string;
  description: string;
  buttonLabel?: string;
  subtitle?: string;
  trackId?: string;
}

export function DownloadCtaSection({
  title,
  description,
  buttonLabel,
  subtitle,
  trackId = 'cta-download',
}: DownloadCtaSectionProps) {
  const locale = useLocale();
  const defaults = getDownloadCtaDefaults(locale);

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
        <Button
          asChild
          size="lg"
          className="bg-foreground text-background hover:bg-foreground/90 rounded-xl text-base font-medium px-8 py-3 cursor-pointer transition-all hover:shadow-lg"
          data-track-cta={trackId}
        >
          <Link to={getPageHref('/download', locale)}>
            <Download size={18} />
            {buttonLabel ?? defaults.buttonLabel}
          </Link>
        </Button>
        <p className="mt-3 text-sm text-tertiary">{subtitle ?? defaults.subtitle}</p>
      </div>
    </section>
  );
}
