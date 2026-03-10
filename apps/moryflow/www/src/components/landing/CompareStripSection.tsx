/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Homepage comparison strip — lightweight product-path cards with hover elevation
 */

'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { HOME_COMPARE_CARDS } from '@/lib/homepage-sections';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useLocale } from '@/routes/{-$locale}/route';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';

export function CompareStripSection() {
  const locale = useLocale();
  const headingRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up' });
  const gridRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 100 });

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div ref={headingRef} className="mb-12 max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-tertiary">
            {t('home.compare.eyebrow', locale)}
          </p>
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl tracking-tight">
            {t('home.compare.title', locale)}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('home.compare.subtitle', locale)}
          </p>
        </div>

        <div ref={gridRef} className="grid gap-6 md:grid-cols-3">
          {HOME_COMPARE_CARDS.map((card) => (
            <div
              key={card.pageId}
              data-reveal-item
              className="group flex h-full flex-col rounded-2xl bg-card shadow-sm p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-tertiary">
                {t('compare.summaryPrefix', locale)} {card.label}
              </p>
              <h3 className="mb-3 text-xl font-bold text-foreground">{t(card.titleKey, locale)}</h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                {t(card.descKey, locale)}
              </p>
              <p className="mb-6 rounded-xl bg-background px-4 py-3 text-sm text-muted-foreground">
                {t(card.fitKey, locale)}
              </p>
              <Link
                to={getPageHref(`/compare/${card.pageId}`, locale)}
                className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
              >
                {t('home.compare.cta', locale)}
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
