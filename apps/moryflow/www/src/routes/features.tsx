/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 功能特性页面（Lucide icons direct render）
 */

import { createFileRoute } from '@tanstack/react-router';
import { generateMeta, siteConfig } from '@/lib/seo';
import { Brain, Globe, Pencil, Shield, Zap, Sparkles, type LucideIcon } from 'lucide-react';

export const Route = createFileRoute('/features')({
  head: () => ({
    meta: generateMeta({
      title: 'Features',
      description:
        "Explore Moryflow's powerful features - memory, web search, content creation, and more.",
      path: '/features',
    }),
    links: [{ rel: 'canonical', href: `${siteConfig.url}/features` }],
  }),
  component: FeaturesPage,
});

const features: { icon: LucideIcon; title: string; description: string; color: string }[] = [
  {
    icon: Brain,
    title: 'Long-term Memory',
    description:
      'Mory remembers your notes, habits, and preferences. The more you use it, the better it understands you.',
    color: 'from-orange-500 to-amber-500',
  },
  {
    icon: Globe,
    title: 'Web Search',
    description:
      'When needed, Mory searches the web for the latest information - exam tips, creative ideas, travel guides.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Pencil,
    title: 'Content Creation',
    description:
      'Not just answering questions - Mory generates content. Study plans, proposals, work summaries.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Shield,
    title: 'Local-first Privacy',
    description:
      'Your data stays on your device by default. No cloud uploads unless you choose to sync.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Zap,
    title: 'Instant Response',
    description: 'No network latency for local operations. Mory is always ready, always fast.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Sparkles,
    title: 'Continuous Evolution',
    description: 'Mory is constantly improving with new capabilities being added regularly.',
    color: 'from-indigo-500 to-purple-500',
  },
];

function FeaturesPage() {
  return (
    <main className="pt-24 pb-20">
      {/* Hero */}
      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-mory-text-primary mb-6">
            Powerful Features
          </h1>
          <p className="text-lg sm:text-xl text-mory-text-secondary max-w-2xl mx-auto">
            Mory combines multiple capabilities to help you accomplish any task. It knows when to
            use which, and how to combine them.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-white rounded-3xl p-8 border border-gray-100 hover:border-mory-orange/30 transition-all hover:-translate-y-1 shadow-sm hover:shadow-md"
                >
                  {/* Icon */}
                  <div className="mb-6">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}
                    >
                      <IconComponent size={28} className="text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-serif font-bold text-mory-text-primary mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-mory-text-secondary leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="bg-gradient-to-br from-mory-bg to-orange-50/50 rounded-3xl p-8 sm:p-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-mory-text-primary mb-4">
              Ready to try?
            </h2>
            <p className="text-mory-text-secondary mb-8">
              Download Moryflow for free and start experiencing the power of a thinking companion.
            </p>
            <a
              href="/download"
              className="inline-flex items-center gap-2 bg-mory-text-primary text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-black transition-all hover:shadow-lg"
            >
              Download Now
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
