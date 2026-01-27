/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 定价页面（Lucide icons direct render）
 */

import { createFileRoute } from '@tanstack/react-router';
import { generateMeta, siteConfig } from '@/lib/seo';
import { Check, Sparkles } from 'lucide-react';

export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: generateMeta({
      title: 'Pricing',
      description: 'Moryflow is free to use. Download now and start using your AI companion.',
      path: '/pricing',
    }),
    links: [{ rel: 'canonical', href: `${siteConfig.url}/pricing` }],
  }),
  component: PricingPage,
});

const freeFeatures = [
  'Unlimited notes and documents',
  'AI assistant with memory',
  'Web search capability',
  'Content generation',
  'Local-first storage',
  'Cross-platform sync (optional)',
  'Regular updates',
  'Community support',
];

function PricingPage() {
  return (
    <main className="pt-24 pb-20">
      {/* Hero */}
      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200 mb-6">
            <Sparkles size={16} className="text-green-600" />
            <span className="text-sm font-medium text-green-700">Currently Free</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-mory-text-primary mb-6">
            Simple Pricing
          </h1>
          <p className="text-lg sm:text-xl text-mory-text-secondary max-w-2xl mx-auto">
            Moryflow is completely free during the beta period. All features, no limitations.
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="px-4 sm:px-6 py-8">
        <div className="container mx-auto max-w-lg">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-mory-orange shadow-xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-bold text-mory-text-primary mb-2">
                Beta Access
              </h2>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-mory-text-primary">$0</span>
                <span className="text-mory-text-secondary">/forever</span>
              </div>
              <p className="text-sm text-mory-text-tertiary mt-2">No credit card required</p>
            </div>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              {freeFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check size={20} className="text-mory-orange flex-shrink-0 mt-0.5" />
                  <span className="text-mory-text-primary">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <a
              href="/download"
              className="block w-full text-center bg-mory-text-primary text-white py-4 rounded-xl font-medium text-lg hover:bg-black transition-all"
            >
              Download Free
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-serif text-3xl font-bold text-mory-text-primary text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-mory-text-primary mb-2">Will it always be free?</h3>
              <p className="text-mory-text-secondary">
                The core features will always be free. We may introduce premium features in the
                future, but everything you use today will remain free.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-mory-text-primary mb-2">Is my data safe?</h3>
              <p className="text-mory-text-secondary">
                Your data is stored locally on your device by default. We never access your notes
                unless you explicitly enable cloud sync.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-mory-text-primary mb-2">
                What platforms are supported?
              </h3>
              <p className="text-mory-text-secondary">
                Currently macOS and Windows. iOS and Android are coming soon.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
