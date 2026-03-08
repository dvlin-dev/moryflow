'use client';

import { createFileRoute, Link } from '@tanstack/react-router';
import { getCanonicalUrl, getPageMeta } from '@/lib/seo';
import { JsonLd, createWebPageSchema } from '@/components/seo/JsonLd';
import { Check } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { resolveLocale, t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

export const Route = createFileRoute('/{-$locale}/pricing')({
  head: ({ params }) => {
    const locale = resolveLocale(params.locale);
    return getPageMeta({
      pageId: 'pricing',
      locale,
      title: t('meta.pricing.title', locale),
      description: t('meta.pricing.description', locale),
    });
  },
  component: PricingPage,
});

const included = [
  'pricing.included.agent',
  'pricing.included.notes',
  'pricing.included.memory',
  'pricing.included.search',
  'pricing.included.telegram',
  'pricing.included.publishing',
  'pricing.included.desktop',
  'pricing.included.updates',
];

function PricingPage() {
  const locale = useLocale();
  const downloadHref = getPageHref('/download', locale);
  const title = t('meta.pricing.title', locale);
  const description = t('meta.pricing.description', locale);

  const faqs = [
    { q: t('pricing.faqAlwaysFree', locale), a: t('pricing.faqAlwaysFreeAnswer', locale) },
    { q: t('pricing.faqData', locale), a: t('pricing.faqDataAnswer', locale) },
    { q: t('pricing.faqPlatforms', locale), a: t('pricing.faqPlatformsAnswer', locale) },
  ];

  return (
    <>
      <JsonLd
        data={createWebPageSchema({
          name: title,
          description,
          url: getCanonicalUrl('/pricing', locale),
        })}
      />
      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="px-4 sm:px-6 py-16 sm:py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-mory-text-primary mb-6">
              {t('pricing.title', locale)}
            </h1>
            <p className="text-lg sm:text-xl text-mory-text-secondary max-w-2xl mx-auto">
              {t('pricing.subtitle', locale)}
            </p>
          </div>
        </section>

        {/* Card */}
        <section className="px-4 sm:px-6 py-8">
          <div className="container mx-auto max-w-md">
            <div className="bg-mory-paper rounded-3xl p-8 sm:p-10 border-2 border-mory-orange">
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl font-bold text-mory-text-primary">$0</span>
                </div>
                <p className="text-sm text-mory-text-tertiary">{t('pricing.priceNote', locale)}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {included.map((itemKey) => (
                  <li key={itemKey} className="flex items-start gap-3 text-sm">
                    <Check size={18} className="text-mory-orange flex-shrink-0 mt-0.5" />
                    <span className="text-mory-text-primary">{t(itemKey, locale)}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={downloadHref}
                className="block w-full text-center bg-mory-text-primary text-white py-4 rounded-xl font-medium text-lg hover:bg-black transition-all"
                data-track-cta="pricing-download"
              >
                {t('pricing.downloadFree', locale)}
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-bold text-mory-text-primary text-center mb-8">
              {t('pricing.faqTitle', locale)}
            </h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="bg-mory-paper rounded-2xl p-6 border border-mory-border"
                >
                  <h3 className="font-bold text-mory-text-primary mb-2">{faq.q}</h3>
                  <p className="text-sm text-mory-text-secondary">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
