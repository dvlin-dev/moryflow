/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Bento grid section — three core pillars: Agent-native / Local-first notes / Publishable knowledge
 */

'use client';

import { Bot, NotebookPen, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';

interface Pillar {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  span: string;
}

const pillars: Pillar[] = [
  {
    icon: Bot,
    titleKey: 'home.pillars.agentTitle',
    descKey: 'home.pillars.agentDesc',
    span: 'md:col-span-2',
  },
  {
    icon: NotebookPen,
    titleKey: 'home.pillars.notesTitle',
    descKey: 'home.pillars.notesDesc',
    span: 'md:col-span-1',
  },
  {
    icon: Globe,
    titleKey: 'home.pillars.publishTitle',
    descKey: 'home.pillars.publishDesc',
    span: 'md:col-span-3',
  },
];

export function CorePillarsSection() {
  const locale = useLocale();

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-mory-text-primary text-center mb-16">
          {t('home.pillars.title', locale)}
        </h2>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.titleKey}
                className={`${pillar.span} bg-mory-paper rounded-3xl p-8 border border-mory-border hover:shadow-mory-md transition-shadow`}
              >
                <div className="w-12 h-12 rounded-2xl bg-mory-orange/10 flex items-center justify-center mb-5">
                  <Icon size={24} className="text-mory-orange" />
                </div>
                <h3 className="font-serif text-xl font-bold text-mory-text-primary mb-3">
                  {t(pillar.titleKey, locale)}
                </h3>
                <p className="text-mory-text-secondary leading-relaxed">
                  {t(pillar.descKey, locale)}
                </p>

                {/* Placeholder for product screenshot */}
                <div className="mt-6 aspect-[16/9] rounded-xl bg-mory-bg border border-mory-border-light flex items-center justify-center">
                  <span className="text-xs text-mory-text-tertiary">
                    {t('home.pillars.screenshotPlaceholder', locale)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
