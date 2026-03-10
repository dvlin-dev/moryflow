/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: How It Works — four-step visual flow with connection lines and gradient accents
 */

'use client';

import { FolderOpen, Cpu, FileOutput, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';

interface Step {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  tintBg: string;
  tintText: string;
}

const steps: Step[] = [
  {
    icon: FolderOpen,
    titleKey: 'home.workflow.step1',
    descKey: 'home.workflow.step1Desc',
    tintBg: 'bg-brand/10',
    tintText: 'text-brand',
  },
  {
    icon: Cpu,
    titleKey: 'home.workflow.step2',
    descKey: 'home.workflow.step2Desc',
    tintBg: 'bg-success/10',
    tintText: 'text-success',
  },
  {
    icon: FileOutput,
    titleKey: 'home.workflow.step3',
    descKey: 'home.workflow.step3Desc',
    tintBg: 'bg-warning/10',
    tintText: 'text-warning',
  },
  {
    icon: Globe,
    titleKey: 'home.workflow.step4',
    descKey: 'home.workflow.step4Desc',
    tintBg: 'bg-brand-light/10',
    tintText: 'text-brand-light',
  },
];

export function WorkflowLoopSection() {
  const locale = useLocale();
  const headingRef = useScrollReveal<HTMLHeadingElement>({ animation: 'fade-up' });
  const gridRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 100 });

  return (
    <section
      className="py-24 sm:py-32 px-4 sm:px-6"
      style={{ background: 'var(--gradient-section-subtle)' }}
    >
      <div className="container mx-auto max-w-5xl">
        <h2
          ref={headingRef}
          className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-16 tracking-tight"
        >
          {t('home.workflow.title', locale)}
        </h2>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.titleKey} data-reveal-item className="relative text-center">
                {/* Step number — gradient */}
                <span className="text-5xl font-extrabold bg-gradient-to-b from-brand/20 to-transparent bg-clip-text text-transparent absolute -top-2 left-1/2 -translate-x-1/2 select-none">
                  {index + 1}
                </span>

                {/* Connection line (desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 -right-4 w-8 h-px bg-border" />
                )}

                <div className="relative pt-10">
                  <div
                    className={`w-14 h-14 mx-auto rounded-xl ${step.tintBg} flex items-center justify-center mb-5`}
                  >
                    <Icon size={24} className={step.tintText} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {t(step.titleKey, locale)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
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
