/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Feature section — AI Agents + Adaptive Memory deep dive
 */

'use client';

import { CircleCheck, Bot } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function FeatureAgents() {
  const locale = useLocale();
  const leftRef = useScrollReveal<HTMLDivElement>({ animation: 'slide-left', duration: 700 });
  const rightRef = useScrollReveal<HTMLDivElement>({ animation: 'slide-right', duration: 700 });

  const points = [
    t('home.agents.point1', locale),
    t('home.agents.point2', locale),
    t('home.agents.point3', locale),
  ];

  return (
    <section
      className="py-24 sm:py-32 px-4 sm:px-6"
      style={{ background: 'var(--gradient-section-subtle)' }}
    >
      <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — text */}
        <div ref={leftRef}>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            {t('home.agents.title', locale)}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8">
            {t('home.agents.desc', locale)}
          </p>

          <ul className="space-y-4">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CircleCheck size={20} className="text-brand mt-0.5 shrink-0" />
                <span className="text-foreground text-base leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {t('home.agents.subtitle', locale)}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('home.agents.memoryDesc', locale)}
            </p>
          </div>
        </div>

        {/* Right — screenshot placeholder */}
        <div
          ref={rightRef}
          className="rounded-2xl bg-card border border-border/50 aspect-[4/3] flex flex-col items-center justify-center gap-4 p-8"
        >
          <Bot size={48} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground text-center">
            {t('home.agents.screenshotAlt', locale)}
          </p>
        </div>
      </div>
    </section>
  );
}
