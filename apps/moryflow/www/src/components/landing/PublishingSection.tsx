/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Publishing section — notes-to-website capability with enhanced visual mockup
 */

'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, Globe } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const publishingPoints = [
  'home.publishing.pointCms',
  'home.publishing.pointSync',
  'home.publishing.pointUpdate',
] as const;

export function PublishingSection() {
  const locale = useLocale();
  const sectionRef = useScrollReveal<HTMLElement>({ animation: 'fade-up' });

  return (
    <section ref={sectionRef} className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="bg-card rounded-2xl shadow-sm p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8">
          {/* Text */}
          <div className="flex-1">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-tertiary">
              {t('home.publishing.eyebrow', locale)}
            </p>
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-5">
              <Globe size={24} className="text-warning" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
              {t('home.publishing.title', locale)}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {t('home.publishing.desc', locale)}
            </p>
            <ul className="mb-6 space-y-3">
              {publishingPoints.map((pointKey) => (
                <li key={pointKey} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success/10">
                    <Check size={12} className="text-success" />
                  </span>
                  <span>{t(pointKey, locale)}</span>
                </li>
              ))}
            </ul>
            <Link
              to={getPageHref('/notes-to-website', locale)}
              className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-dark transition-colors"
            >
              {t('home.publishing.learnMore', locale)} <ArrowRight size={16} />
            </Link>
          </div>

          {/* Visual mockup — Notes → Website */}
          <div className="flex-1 w-full">
            <div className="aspect-[4/3] rounded-xl bg-background border border-border-muted p-4 shadow-xs">
              <div className="flex h-full flex-col gap-3">
                {/* Notebook pane */}
                <div className="rounded-lg border border-border bg-card p-4 flex-1">
                  <div className="flex gap-1.5 mb-3">
                    <div className="w-2 h-2 rounded-full bg-destructive/30" />
                    <div className="w-2 h-2 rounded-full bg-warning/30" />
                    <div className="w-2 h-2 rounded-full bg-success/30" />
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-tertiary mb-1.5">
                    {t('home.publishing.visualNotesLabel', locale)}
                  </p>
                  <div className="space-y-1.5">
                    <div className="h-1.5 rounded bg-foreground/10 w-3/4" />
                    <div className="h-1.5 rounded bg-foreground/7 w-1/2" />
                    <div className="h-1.5 rounded bg-foreground/5 w-2/3" />
                  </div>
                </div>

                {/* Arrow bridge */}
                <div className="flex items-center justify-center py-0.5">
                  <div className="h-5 w-px bg-gradient-to-b from-brand to-brand-light" />
                </div>

                {/* Website pane */}
                <div className="rounded-lg border border-border bg-card p-4 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 rounded bg-brand/20" />
                    <div className="h-1.5 w-16 rounded bg-foreground/10" />
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-tertiary mb-1.5">
                    {t('home.publishing.visualSiteLabel', locale)}
                  </p>
                  <div className="space-y-1.5">
                    <div className="h-1.5 rounded bg-foreground/10 w-4/5" />
                    <div className="h-1.5 rounded bg-foreground/7 w-3/5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
