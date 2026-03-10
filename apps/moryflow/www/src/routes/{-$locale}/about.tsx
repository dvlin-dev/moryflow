import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { Shield, Lightbulb, Users, type LucideIcon } from 'lucide-react';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';

export const Route = createFileRoute('/{-$locale}/about')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'about',
      locale: params.locale,
      title: 'About',
      description:
        'About Moryflow — building a local-first AI agent workspace where knowledge work happens on your terms.',
    }),
  component: AboutPage,
});

const values: {
  icon: LucideIcon;
  title: string;
  description: string;
  tintBg: string;
  tintText: string;
}[] = [
  {
    icon: Shield,
    title: 'Local-first by default',
    description:
      'Your data stays on your device. We built Moryflow so you never have to trade privacy for productivity.',
    tintBg: 'bg-brand/10',
    tintText: 'text-brand',
  },
  {
    icon: Lightbulb,
    title: 'Knowledge over chat',
    description:
      'AI conversations are useful, but durable knowledge is more valuable. Every agent interaction produces outputs you can keep, organize, and publish.',
    tintBg: 'bg-success/10',
    tintText: 'text-success',
  },
  {
    icon: Users,
    title: 'Tools for people, not platforms',
    description:
      'No lock-in, no dark patterns. Moryflow works with your files and formats. If you leave, your knowledge goes with you.',
    tintBg: 'bg-warning/10',
    tintText: 'text-warning',
  },
];

function AboutPage() {
  const heroRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up' });
  const missionRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up' });
  const valuesRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 120 });

  return (
    <main className="pt-24 pb-20">
      {/* Hero */}
      <section className="relative px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'var(--gradient-hero-glow)' }}
        />
        <div ref={heroRef} className="container relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight">
            About Moryflow
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            We're building an AI agent workspace that treats your knowledge as something worth
            keeping — not just another chat to scroll past.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-4xl">
          <div ref={missionRef} className="bg-card rounded-2xl p-8 sm:p-12 shadow-sm">
            <h2 className="text-3xl font-bold text-foreground mb-6 tracking-tight">
              What we believe
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              AI agents are most useful when they work with context you've built over time — your
              notes, your research, your accumulated knowledge. Not just a blank prompt window.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Moryflow gives you a workspace where agents and knowledge live together. Results
              aren't ephemeral chat messages — they're notes you own, organize, and publish.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section
        className="px-4 sm:px-6 py-16"
        style={{ background: 'var(--gradient-section-subtle)' }}
      >
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12 tracking-tight">
            How we build
          </h2>
          <div ref={valuesRef} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} data-reveal-item className="text-center">
                  <div
                    className={`w-14 h-14 mx-auto mb-5 ${value.tintBg} rounded-xl flex items-center justify-center`}
                  >
                    <Icon size={28} className={value.tintText} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-3">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4 tracking-tight">Get in touch</h2>
          <p className="text-muted-foreground mb-8">
            Questions, feedback, or ideas — we'd like to hear from you.
          </p>
          <a
            href="mailto:hello@moryflow.com"
            className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-xl font-medium hover:bg-foreground/90 transition-all hover:shadow-lg"
          >
            Contact us
          </a>
        </div>
      </section>
    </main>
  );
}
