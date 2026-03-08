/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: How It Works — linear four-step visual flow
 */

'use client';

import { FolderOpen, Cpu, FileOutput, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';

interface Step {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}

const steps: Step[] = [
  { icon: FolderOpen, titleKey: 'home.workflow.step1', descKey: 'home.workflow.step1Desc' },
  { icon: Cpu, titleKey: 'home.workflow.step2', descKey: 'home.workflow.step2Desc' },
  { icon: FileOutput, titleKey: 'home.workflow.step3', descKey: 'home.workflow.step3Desc' },
  { icon: Globe, titleKey: 'home.workflow.step4', descKey: 'home.workflow.step4Desc' },
];

export function WorkflowLoopSection() {
  const locale = useLocale();

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 bg-mory-paper">
      <div className="container mx-auto max-w-5xl">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-mory-text-primary text-center mb-16">
          {t('home.workflow.title', locale)}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.titleKey} className="relative text-center">
                {/* Step number */}
                <span className="text-5xl font-bold text-mory-border-light font-serif absolute -top-2 left-1/2 -translate-x-1/2 select-none">
                  {index + 1}
                </span>

                <div className="relative pt-10">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-mory-orange/10 flex items-center justify-center mb-5">
                    <Icon size={24} className="text-mory-orange" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-mory-text-primary mb-2">
                    {t(step.titleKey, locale)}
                  </h3>
                  <p className="text-sm text-mory-text-secondary leading-relaxed">
                    {t(step.descKey, locale)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
