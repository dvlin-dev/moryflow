/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Homepage capability section — Telegram entry for the Moryflow agent workflow
 */

'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight, Brain, FileText, MessageCircle } from 'lucide-react';
import { HOME_TELEGRAM_POINT_KEYS } from '@/lib/homepage-sections';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useLocale } from '@/routes/{-$locale}/route';

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

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-mory-paper">
      <div className="container mx-auto max-w-5xl">
        <div className="grid gap-8 rounded-3xl border border-mory-border bg-mory-bg p-8 sm:grid-cols-[1.15fr_0.85fr] sm:p-12">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-mory-text-tertiary">
              {t('home.telegram.eyebrow', locale)}
            </p>
            <h2 className="mb-4 font-serif text-3xl font-bold text-mory-text-primary sm:text-4xl">
              {t('home.telegram.title', locale)}
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-mory-text-secondary sm:text-lg">
              {t('home.telegram.desc', locale)}
            </p>
            <Link
              to={getPageHref('/telegram-ai-agent', locale)}
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-mory-orange transition-colors hover:text-mory-orange-dark"
            >
              {t('home.telegram.cta', locale)}
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="rounded-3xl border border-mory-border bg-mory-paper p-6">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-mory-border bg-mory-bg px-3 py-1 text-xs font-medium text-mory-text-tertiary">
              <MessageCircle size={14} className="text-mory-orange" />
              {t('home.telegram.cardLabel', locale)}
            </div>
            <div className="space-y-4">
              {telegramPoints.map((point) => {
                const Icon = point.icon;

                return (
                  <div
                    key={point.key}
                    className="rounded-2xl border border-mory-border bg-mory-bg px-4 py-4"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mory-orange/10">
                        <Icon size={18} className="text-mory-orange" />
                      </div>
                      <span className="text-sm font-medium text-mory-text-primary">
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
