/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Homepage Telegram agent capability — gradient container + chat-style feature cards
 */

'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight, Brain, FileText, MessageCircle } from 'lucide-react';
import { HOME_TELEGRAM_POINT_KEYS } from '@/lib/homepage-sections';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useLocale } from '@/routes/{-$locale}/route';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';

const telegramPoints = [
  { icon: MessageCircle, key: 'home.telegram.pointChat' },
  { icon: Brain, key: 'home.telegram.pointGrounded' },
  { icon: FileText, key: 'home.telegram.pointCapture' },
] as const satisfies ReadonlyArray<{
  icon: typeof MessageCircle;
  key: (typeof HOME_TELEGRAM_POINT_KEYS)[number];
}>;

export function TelegramAgentSection() {
  const locale = useLocale();
  const sectionRef = useScrollReveal<HTMLElement>({ animation: 'fade-up' });
  const pointsRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 100, delay: 200 });

  return (
    <section
      ref={sectionRef}
      className="py-24 sm:py-32 px-4 sm:px-6"
      style={{ background: 'var(--gradient-section-subtle)' }}
    >
      <div className="container mx-auto max-w-5xl">
        <div className="grid gap-8 rounded-2xl bg-card shadow-sm p-8 sm:grid-cols-[1.15fr_0.85fr] sm:p-12">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-tertiary">
              {t('home.telegram.eyebrow', locale)}
            </p>
            <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl tracking-tight">
              {t('home.telegram.title', locale)}
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('home.telegram.desc', locale)}
            </p>
            <Link
              to={getPageHref('/telegram-ai-agent', locale)}
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
            >
              {t('home.telegram.cta', locale)}
              <ArrowRight size={16} />
            </Link>
          </div>

          <div ref={pointsRef} className="rounded-2xl border border-border bg-background p-6">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border-muted bg-card px-3 py-1 text-xs font-medium text-tertiary">
              <MessageCircle size={14} className="text-brand" />
              {t('home.telegram.cardLabel', locale)}
            </div>
            <div className="space-y-3">
              {telegramPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <div
                    key={point.key}
                    data-reveal-item
                    className="rounded-xl border border-border-muted bg-card px-4 py-3.5 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10">
                        <Icon size={18} className="text-brand" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {t(point.key, locale)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
