/**
 * How It Works Section
 *
 * [PROPS]: None
 * [POS]: Explains the Digest subscription workflow
 */

import { Search01Icon, AiBrain01Icon, Mail01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@aiget/ui';
import { Container } from '@/components/layout';

const steps = [
  {
    icon: Search01Icon,
    title: 'Follow Topics',
    description:
      'Browse and subscribe to topics that interest you, or create your own custom digest.',
  },
  {
    icon: AiBrain01Icon,
    title: 'AI Curates',
    description:
      'Our AI scans the web, filters noise, and identifies the most valuable content for you.',
  },
  {
    icon: Mail01Icon,
    title: 'Get Summaries',
    description:
      'Receive structured digests with AI summaries on your schedule—daily, weekly, or custom.',
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-border bg-muted/30 py-16 md:py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">How It Works</h2>
          <p className="mt-3 text-muted-foreground">
            Three simple steps to stay informed without information overload
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              {/* Step number */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </div>

              {/* Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
                <Icon icon={step.icon} className="h-7 w-7 text-muted-foreground" />
              </div>

              {/* Content */}
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
