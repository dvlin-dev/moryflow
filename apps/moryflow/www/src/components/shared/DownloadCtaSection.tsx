/**
 * [PROPS]: { title, description, buttonLabel, trackId }
 * [EMITS]: 无
 * [POS]: 可复用底部下载 CTA section
 */

'use client';

import { Link } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { useLocale } from '@/routes/{-$locale}/route';
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
  buttonLabel = 'Download Moryflow',
  subtitle = 'Free during beta \u00b7 macOS & Windows',
  trackId = 'cta-download',
}: DownloadCtaSectionProps) {
  const locale = useLocale();

  return (
    <section className="px-4 sm:px-6 py-16 sm:py-24">
      <div className="container mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-mory-text-primary mb-4">
          {title}
        </h2>
        <p className="text-mory-text-secondary mb-8 max-w-xl mx-auto">{description}</p>
        <Button
          asChild
          size="lg"
          className="bg-mory-text-primary text-white hover:bg-black rounded-xl text-base font-medium px-8 py-3 cursor-pointer"
          data-track-cta={trackId}
        >
          <Link to={getPageHref('/download', locale)}>
            <Download size={18} />
            {buttonLabel}
          </Link>
        </Button>
        <p className="mt-3 text-sm text-mory-text-tertiary">{subtitle}</p>
      </div>
    </section>
  );
}
