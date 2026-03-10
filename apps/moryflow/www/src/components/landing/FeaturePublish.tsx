/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Feature section — Publishing + Remote Agent (mirror layout of FeatureAgents)
 */

'use client';

import { Globe, MessageCircle, FileOutput } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function FeaturePublish() {
  const locale = useLocale();
  const leftRef = useScrollReveal<HTMLDivElement>({ animation: 'slide-left', duration: 700 });
  const rightRef = useScrollReveal<HTMLDivElement>({ animation: 'slide-right', duration: 700 });

  return (
    <section
      className="py-24 sm:py-32 px-4 sm:px-6"
      style={{ background: 'var(--gradient-section-subtle)' }}
    >
      <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — screenshot placeholder */}
        <div
          ref={leftRef}
          className="rounded-2xl bg-card border border-border/50 aspect-[4/3] flex flex-col items-center justify-center gap-4 p-8 order-2 lg:order-1"
        >
          <FileOutput size={48} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground text-center">
            {t('home.publish.screenshotAlt', locale)}
          </p>
        </div>

        {/* Right — text */}
        <div ref={rightRef} className="order-1 lg:order-2">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            {t('home.publish.title', locale)}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8">
            {t('home.publish.desc', locale)}
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0"
                aria-label={t('home.publish.publishTitle', locale)}
              >
                <Globe size={20} className="text-brand" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {t('home.publish.publishTitle', locale)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('home.publish.publishDesc', locale)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0"
                aria-label={t('home.publish.remoteTitle', locale)}
              >
                <MessageCircle size={20} className="text-brand" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {t('home.publish.remoteTitle', locale)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('home.publish.remoteDesc', locale)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
