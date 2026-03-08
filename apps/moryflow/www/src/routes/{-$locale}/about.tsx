import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { Shield, Lightbulb, Users, type LucideIcon } from 'lucide-react';

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

const values: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Shield,
    title: 'Local-first by default',
    description:
      'Your data stays on your device. We built Moryflow so you never have to trade privacy for productivity.',
  },
  {
    icon: Lightbulb,
    title: 'Knowledge over chat',
    description:
      'AI conversations are useful, but durable knowledge is more valuable. Every agent interaction produces outputs you can keep, organize, and publish.',
  },
  {
    icon: Users,
    title: 'Tools for people, not platforms',
    description:
      'No lock-in, no dark patterns. Moryflow works with your files and formats. If you leave, your knowledge goes with you.',
  },
];

function AboutPage() {
  return (
    <main className="pt-24 pb-20">
      {/* Hero */}
      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-mory-text-primary mb-6">
            About Moryflow
          </h1>
          <p className="text-lg sm:text-xl text-mory-text-secondary max-w-2xl mx-auto">
            We're building an AI agent workspace that treats your knowledge as something worth
            keeping — not just another chat to scroll past.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-mory-paper rounded-3xl p-8 sm:p-12 border border-mory-border">
            <h2 className="font-serif text-3xl font-bold text-mory-text-primary mb-6">
              What we believe
            </h2>
            <p className="text-lg text-mory-text-secondary leading-relaxed mb-6">
              AI agents are most useful when they work with context you've built over time — your
              notes, your research, your accumulated knowledge. Not just a blank prompt window.
            </p>
            <p className="text-lg text-mory-text-secondary leading-relaxed">
              Moryflow gives you a workspace where agents and knowledge live together. Results
              aren't ephemeral chat messages — they're notes you own, organize, and publish.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-serif text-3xl font-bold text-mory-text-primary text-center mb-12">
            How we build
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="text-center">
                  <div className="w-14 h-14 mx-auto mb-5 bg-mory-orange/10 rounded-2xl flex items-center justify-center">
                    <Icon size={28} className="text-mory-orange" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-mory-text-primary mb-3">
                    {value.title}
                  </h3>
                  <p className="text-sm text-mory-text-secondary leading-relaxed">
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
          <h2 className="font-serif text-2xl font-bold text-mory-text-primary mb-4">
            Get in touch
          </h2>
          <p className="text-mory-text-secondary mb-8">
            Questions, feedback, or ideas — we'd like to hear from you.
          </p>
          <a
            href="mailto:hello@moryflow.com"
            className="inline-flex items-center gap-2 bg-mory-text-primary text-white px-8 py-4 rounded-xl font-medium hover:bg-black transition-all"
          >
            Contact us
          </a>
        </div>
      </section>
    </main>
  );
}
