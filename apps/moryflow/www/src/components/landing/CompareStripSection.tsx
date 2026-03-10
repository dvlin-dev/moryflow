/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Homepage comparison strip — Top 3 cards by traffic + bottom links to remaining
 */

'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { HOME_COMPARE_CARDS, HOME_COMPARE_MORE } from '@/lib/homepage-sections';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useLocale } from '@/routes/{-$locale}/route';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';

export function CompareStripSection() {
  const locale = useLocale();
  const headingRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up' });
  const gridRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 100 });

  return (
    <section
      className="py-24 sm:py-32 px-4 sm:px-6"
      style={{ background: 'var(--gradient-section-subtle)' }}
    >
      <div className="container mx-auto max-w-5xl">
        <div ref={headingRef} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            {t('home.compare.title', locale)}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            {t('home.compare.subtitle', locale)}
          </p>
        </div>

        <div ref={gridRef} className="grid gap-6 md:grid-cols-3 mb-8">
          {HOME_COMPARE_CARDS.map((card) => (
            <Link
              key={card.pageId}
              to={getPageHref(`/compare/${card.pageId}`, locale)}
              data-reveal-item
              className="group flex flex-col rounded-2xl bg-card shadow-sm p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-tertiary">
                {t('compare.summaryPrefix', locale)} {card.label}
              </p>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                {t(card.descKey, locale)}
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-brand transition-colors group-hover:text-brand-dark">
                {t('home.compare.cta', locale)}
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </span>
            </Link>
          ))}
        </div>

        {/* More comparisons */}
        <p className="text-center text-sm text-muted-foreground">
          {t('home.compare.alsoCompare', locale)}{' '}
          {HOME_COMPARE_MORE.map((item, i) => (
            <span key={item.pageId}>
              {i > 0 && ', '}
              <Link
                to={getPageHref(`/compare/${item.pageId}`, locale)}
                className="font-medium text-brand hover:text-brand-dark transition-colors"
              >
                {item.label}
              </Link>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
