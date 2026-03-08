/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Publishing section — notes to website capability highlight
 */

'use client';

import { Link } from '@tanstack/react-router';
import { Globe, ArrowRight } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

export function PublishingSection() {
  const locale = useLocale();

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="bg-mory-paper rounded-3xl border border-mory-border p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8">
          {/* Text */}
          <div className="flex-1">
            <div className="w-12 h-12 rounded-2xl bg-mory-orange/10 flex items-center justify-center mb-5">
              <Globe size={24} className="text-mory-orange" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-mory-text-primary mb-4">
              {t('home.publishing.title', locale)}
            </h2>
            <p className="text-mory-text-secondary leading-relaxed mb-6">
              {t('home.publishing.desc', locale)}
            </p>
            <Link
              to={getPageHref('/notes-to-website', locale)}
              className="inline-flex items-center gap-2 text-sm font-medium text-mory-orange hover:text-mory-orange-dark transition-colors"
            >
              {t('home.publishing.learnMore', locale)} <ArrowRight size={16} />
            </Link>
          </div>

          {/* Visual placeholder */}
          <div className="flex-1 w-full">
            <div className="aspect-[4/3] rounded-2xl bg-mory-bg border border-mory-border-light flex items-center justify-center">
              <span className="text-xs text-mory-text-tertiary">
                {t('home.pillars.screenshotPlaceholder', locale)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
