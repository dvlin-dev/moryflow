/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Bento grid — three core pillars with differentiated icon tints and shadow cards
 */

'use client';

import { Bot, NotebookPen, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';

interface Pillar {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  span: string;
  /** Differentiated icon tint color */
  tintBg: string;
  tintText: string;
}

const pillars: Pillar[] = [
  {
    icon: Bot,
    titleKey: 'home.pillars.agentTitle',
    descKey: 'home.pillars.agentDesc',
    span: 'md:col-span-2',
    tintBg: 'bg-brand/10',
    tintText: 'text-brand',
  },
  {
    icon: NotebookPen,
    titleKey: 'home.pillars.notesTitle',
    descKey: 'home.pillars.notesDesc',
    span: 'md:col-span-1',
    tintBg: 'bg-success/10',
    tintText: 'text-success',
  },
  {
    icon: Globe,
    titleKey: 'home.pillars.publishTitle',
    descKey: 'home.pillars.publishDesc',
    span: 'md:col-span-3',
    tintBg: 'bg-warning/10',
    tintText: 'text-warning',
  },
];

export function CorePillarsSection() {
  const locale = useLocale();
  const headingRef = useScrollReveal<HTMLHeadingElement>({ animation: 'fade-up' });
  const gridRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 120 });

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <h2
          ref={headingRef}
          className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-16 tracking-tight"
        >
          {t('home.pillars.title', locale)}
        </h2>

        {/* Bento Grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.titleKey}
                data-reveal-item
                className={`${pillar.span} bg-card rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${pillar.tintBg} flex items-center justify-center mb-5`}
                >
                  <Icon size={24} className={pillar.tintText} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {t(pillar.titleKey, locale)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{t(pillar.descKey, locale)}</p>

                {/* Abstract UI mockup placeholder */}
                <div className="mt-6 aspect-[16/9] rounded-xl bg-background border border-border-muted overflow-hidden">
                  <div className="h-full flex flex-col p-3 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-destructive/30" />
                      <div className="w-2 h-2 rounded-full bg-warning/30" />
                      <div className="w-2 h-2 rounded-full bg-success/30" />
                    </div>
                    <div className="flex-1 flex gap-2">
                      <div className="w-1/4 rounded-lg bg-muted/50" />
                      <div className="flex-1 space-y-2">
                        <div className="h-2 rounded bg-muted/60 w-3/4" />
                        <div className="h-2 rounded bg-muted/40 w-1/2" />
                        <div className="h-2 rounded bg-muted/30 w-2/3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
