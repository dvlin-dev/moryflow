/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Homepage comparison strip — lightweight product-path comparison before publishing
 */

'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { HOME_COMPARE_CARDS } from '@/lib/homepage-sections';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useLocale } from '@/routes/{-$locale}/route';

export function CompareStripSection() {
  const locale = useLocale();

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-mory-text-tertiary">
            {t('home.compare.eyebrow', locale)}
          </p>
          <h2 className="mb-4 font-serif text-3xl font-bold text-mory-text-primary sm:text-4xl">
            {t('home.compare.title', locale)}
          </h2>
          <p className="text-base leading-relaxed text-mory-text-secondary sm:text-lg">
            {t('home.compare.subtitle', locale)}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {HOME_COMPARE_CARDS.map((card) => (
            <div
              key={card.pageId}
              className="flex h-full flex-col rounded-3xl border border-mory-border bg-mory-paper p-6"
            >
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-mory-text-tertiary">
                {t('compare.summaryPrefix', locale)} {card.label}
              </p>
              <h3 className="mb-3 font-serif text-xl font-bold text-mory-text-primary">
                {t(card.titleKey, locale)}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-mory-text-secondary">
                {t(card.descKey, locale)}
              </p>
              <p className="mb-6 rounded-2xl bg-mory-bg px-4 py-3 text-sm text-mory-text-secondary">
                {t(card.fitKey, locale)}
              </p>
              <Link
                to={getPageHref(`/compare/${card.pageId}`, locale)}
                className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-mory-orange transition-colors hover:text-mory-orange-dark"
              >
                {t('home.compare.cta', locale)}
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
