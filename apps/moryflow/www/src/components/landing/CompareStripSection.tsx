/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Homepage horizontal comparison cards — each card self-contained with feature labels + values
 */

'use client';

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, CircleCheck } from 'lucide-react';
import {
  HOME_COMPARE_FEATURES,
  HOME_COMPARE_PRODUCTS,
  type CompareProduct,
  type FeatureValue,
} from '@/lib/homepage-sections';
import { cn } from '@/lib/cn';
import { t, type Locale } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useLocale } from '@/routes/{-$locale}/route';
import { useScrollReveal } from '@/hooks/useScrollReveal';

/** Consistent h-6 container for cross-card row alignment */
function ValueIcon({
  value,
  isSelf,
  locale,
}: {
  value: FeatureValue;
  isSelf: boolean;
  locale: Locale;
}) {
  if (value === true) {
    return isSelf ? (
      <span
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20"
        aria-label="Included"
      >
        <CircleCheck size={14} className="text-white" aria-hidden="true" />
      </span>
    ) : (
      <span className="inline-flex h-6 shrink-0 items-center justify-center" aria-label="Included">
        <Check size={18} strokeWidth={2.5} className="text-foreground" aria-hidden="true" />
      </span>
    );
  }

  if (value === false) {
    return (
      <span
        aria-label="Not included"
        className={cn(
          'inline-flex h-6 shrink-0 items-center justify-center',
          isSelf ? 'text-white/50' : 'text-muted-foreground'
        )}
      >
        <span aria-hidden="true">—</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center text-sm',
        isSelf ? 'text-white/70' : 'text-muted-foreground'
      )}
    >
      {t(value, locale)}
    </span>
  );
}

function ProductCard({
  product,
  hoveredRow,
  onRowEnter,
  onRowLeave,
  locale,
}: {
  product: CompareProduct;
  hoveredRow: number | null;
  onRowEnter: (row: number) => void;
  onRowLeave: () => void;
  locale: Locale;
}) {
  const isSelf = product.isSelf;

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col rounded-2xl',
        isSelf
          ? 'min-w-[260px] sm:min-w-[360px] bg-gradient-to-b from-brand to-brand-dark text-white sm:shadow-[4px_0_16px_-2px_rgba(124,92,252,0.18)] sm:sticky sm:left-0 sm:z-10'
          : 'min-w-[220px] sm:min-w-[300px] bg-card shadow-sm'
      )}
    >
      {/* Header — identical height across all cards for row alignment */}
      <div className="px-7 pt-6 pb-5">
        {isSelf ? (
          <p className="text-lg font-bold">{product.name}</p>
        ) : product.compareHref ? (
          <Link
            to={getPageHref(product.compareHref, locale)}
            aria-label={`Compare Moryflow vs ${product.name}`}
            className="text-lg font-bold text-foreground hover:text-brand transition-colors"
          >
            {product.name}
          </Link>
        ) : (
          <p className="text-lg font-bold text-foreground">{product.name}</p>
        )}
      </div>

      {/* Feature rows */}
      <div className="flex flex-col px-3 pb-5">
        {HOME_COMPARE_FEATURES.map((feat, idx) => {
          const isLast = idx === HOME_COMPARE_FEATURES.length - 1;
          const isHovered = hoveredRow === idx;

          return (
            <div
              key={feat.key}
              className={cn(
                'flex items-center justify-between gap-6 px-4 py-3.5 transition-colors',
                !isLast && (isSelf ? 'border-b border-white/10' : 'border-b border-border/60'),
                isHovered && (isSelf ? 'bg-white/10' : 'bg-[rgb(124_92_252/0.05)]')
              )}
              onPointerEnter={() => onRowEnter(idx)}
              onPointerLeave={onRowLeave}
            >
              <span className={cn(isSelf ? 'text-sm text-white/90' : 'text-sm text-foreground/70')}>
                {t(feat.labelKey, locale)}
              </span>
              <ValueIcon value={product.values[feat.key]} isSelf={isSelf} locale={locale} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompareStripSection() {
  const locale = useLocale();
  const sectionRef = useScrollReveal<HTMLElement>({ animation: 'fade-up' });
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <section
      ref={sectionRef}
      className="py-24 sm:py-32 px-4 sm:px-6"
      style={{ background: 'var(--gradient-section-subtle)' }}
    >
      <div className="container mx-auto max-w-6xl">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            {t('home.compare.title', locale)}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            {t('home.compare.subtitle', locale)}
          </p>
        </div>

        {/* Card list */}
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-3 sm:gap-5 min-w-max pb-2">
            {HOME_COMPARE_PRODUCTS.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                hoveredRow={hoveredRow}
                onRowEnter={setHoveredRow}
                onRowLeave={() => setHoveredRow(null)}
                locale={locale}
              />
            ))}
          </div>
        </div>

        {/* Bottom: scroll hint (mobile) + full comparison link */}
        <div className="mt-6 text-center space-y-2">
          <p className="md:hidden text-xs text-muted-foreground">
            ← {t('home.compare.scrollHint', locale)} →
          </p>
          <p className="text-sm text-muted-foreground">
            <Link
              to={getPageHref('/compare', locale)}
              className="font-medium text-brand hover:text-brand-dark transition-colors"
            >
              {t('home.compare.seeFullComparison', locale)}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
