/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Publishing section — notes to website capability highlight
 */

'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, Globe } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

const publishingPoints = [
  'home.publishing.pointCms',
  'home.publishing.pointSync',
  'home.publishing.pointUpdate',
] as const;

export function PublishingSection() {
  const locale = useLocale();

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="bg-mory-paper rounded-3xl border border-mory-border p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8">
          {/* Text */}
          <div className="flex-1">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-mory-text-tertiary">
              {t('home.publishing.eyebrow', locale)}
            </p>
            <div className="w-12 h-12 rounded-2xl bg-mory-orange/10 flex items-center justify-center mb-5">
              <Globe size={24} className="text-mory-orange" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-mory-text-primary mb-4">
              {t('home.publishing.title', locale)}
            </h2>
            <p className="text-mory-text-secondary leading-relaxed mb-6">
              {t('home.publishing.desc', locale)}
            </p>
            <ul className="mb-6 space-y-3">
              {publishingPoints.map((pointKey) => (
                <li
                  key={pointKey}
                  className="flex items-start gap-3 text-sm text-mory-text-secondary"
                >
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-mory-orange/10">
                    <Check size={12} className="text-mory-orange" />
                  </span>
                  <span>{t(pointKey, locale)}</span>
                </li>
              ))}
            </ul>
            <Link
              to={getPageHref('/notes-to-website', locale)}
              className="inline-flex items-center gap-2 text-sm font-medium text-mory-orange hover:text-mory-orange-dark transition-colors"
            >
              {t('home.publishing.learnMore', locale)} <ArrowRight size={16} />
            </Link>
          </div>

          {/* Visual placeholder */}
          <div className="flex-1 w-full">
            <div className="aspect-[4/3] rounded-2xl bg-mory-bg border border-mory-border-light p-5">
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-mory-border bg-mory-paper p-4">
                <div className="rounded-2xl border border-mory-border bg-mory-bg p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-mory-text-tertiary">
                    {t('home.publishing.visualNotesLabel', locale)}
                  </p>
                  <p className="mt-2 text-sm text-mory-text-primary">
                    {t('home.publishing.visualNotesValue', locale)}
                  </p>
                </div>
                <div className="flex items-center justify-center text-xs font-medium uppercase tracking-[0.16em] text-mory-orange">
                  {t('home.publishing.visualBridge', locale)}
                </div>
                <div className="rounded-2xl border border-mory-border bg-mory-bg p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-mory-text-tertiary">
                    {t('home.publishing.visualSiteLabel', locale)}
                  </p>
                  <p className="mt-2 text-sm text-mory-text-primary">
                    {t('home.publishing.visualSiteValue', locale)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
