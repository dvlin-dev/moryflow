'use client';

import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { JsonLd, createSoftwareApplicationSchema } from '@/components/seo/JsonLd';
import { Check } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { resolveLocale, t, type Locale } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/cn';

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

type BillingCycle = 'monthly' | 'yearly';

interface TierData {
  id: string;
  name: string;
  monthly: number;
  yearly: number;
  credits: string;
  sites: string;
  storage: string;
  fileSize: string;
  recommended?: boolean;
  features: string[];
}

function getTiers(locale: Locale): TierData[] {
  return [
    {
      id: 'free',
      name: t('pricing.tier.free', locale),
      monthly: 0,
      yearly: 0,
      credits: t('pricing.credits.free', locale),
      sites: '1',
      storage: '50 MB',
      fileSize: '1 MB',
      features: [
        t('pricing.feat.agents', locale),
        t('pricing.feat.localKb', locale),
        t('pricing.feat.memory', locale),
        t('pricing.feat.remote', locale),
        t('pricing.feat.publish', locale),
        t('pricing.feat.byok', locale),
      ],
    },
    {
      id: 'starter',
      name: t('pricing.tier.starter', locale),
      monthly: 4.99,
      yearly: 49.9,
      credits: t('pricing.credits.starter', locale),
      sites: '3',
      storage: '500 MB',
      fileSize: '5 MB',
      features: [
        t('pricing.feat.allFree', locale),
        t('pricing.feat.credits5k', locale),
        t('pricing.feat.sites3', locale),
        t('pricing.feat.storage500m', locale),
      ],
    },
    {
      id: 'basic',
      name: t('pricing.tier.basic', locale),
      monthly: 9.9,
      yearly: 99,
      credits: t('pricing.credits.basic', locale),
      sites: 'unlimited',
      storage: '1 GB',
      fileSize: '10 MB',
      recommended: true,
      features: [
        t('pricing.feat.allStarter', locale),
        t('pricing.feat.credits10k', locale),
        t('pricing.feat.sitesUnlimited', locale),
        t('pricing.feat.storage1g', locale),
      ],
    },
    {
      id: 'pro',
      name: t('pricing.tier.pro', locale),
      monthly: 19.9,
      yearly: 199,
      credits: t('pricing.credits.pro', locale),
      sites: 'unlimited',
      storage: '10 GB',
      fileSize: '100 MB',
      features: [
        t('pricing.feat.allBasic', locale),
        t('pricing.feat.credits20k', locale),
        t('pricing.feat.sitesUnlimited', locale),
        t('pricing.feat.storage10g', locale),
      ],
    },
  ];
}

const CREDIT_PACKS = [
  { credits: 5000, price: 5 },
  { credits: 10000, price: 10 },
  { credits: 50000, price: 50 },
];

function formatPrice(price: number): string {
  if (price === 0) return '$0';
  if (Number.isInteger(price)) return `$${price}`;
  return `$${price.toFixed(2)}`;
}

function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const locale = useLocale();
  const tiers = getTiers(locale);
  const downloadHref = getPageHref('/download', locale);
  const heroRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up' });
  const gridRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 80 });

  const faqs = [
    { q: t('pricing.faqCredits', locale), a: t('pricing.faqCreditsAnswer', locale) },
    { q: t('pricing.faqData', locale), a: t('pricing.faqDataAnswer', locale) },
    { q: t('pricing.faqPlatforms', locale), a: t('pricing.faqPlatformsAnswer', locale) },
    { q: t('pricing.faqCancel', locale), a: t('pricing.faqCancelAnswer', locale) },
  ];

  return (
    <>
      <JsonLd
        data={createSoftwareApplicationSchema([
          { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Starter', price: '4.99', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Basic', price: '9.90', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Pro', price: '19.90', priceCurrency: 'USD' },
        ])}
      />
      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="relative px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'var(--gradient-hero-glow)' }}
          />
          <div ref={heroRef} className="container relative mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight">
              {t('pricing.title', locale)}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              {t('pricing.subtitle', locale)}
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card p-1">
              <button
                onClick={() => setBilling('monthly')}
                className={cn(
                  'rounded-full px-5 py-2 text-sm font-medium transition-all',
                  billing === 'monthly'
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('pricing.monthly', locale)}
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={cn(
                  'rounded-full px-5 py-2 text-sm font-medium transition-all',
                  billing === 'yearly'
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('pricing.yearly', locale)}
                <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand font-semibold">
                  {t('pricing.yearlySave', locale)}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-4 sm:px-6 py-8">
          <div className="container mx-auto max-w-6xl">
            <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {tiers.map((tier) => {
                const price = billing === 'monthly' ? tier.monthly : tier.yearly;
                const suffix =
                  tier.monthly === 0
                    ? ''
                    : billing === 'monthly'
                      ? t('pricing.mo', locale)
                      : t('pricing.yr', locale);

                return (
                  <div
                    key={tier.id}
                    data-reveal-item
                    className={cn(
                      'relative flex flex-col rounded-2xl bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg',
                      tier.recommended
                        ? 'border-2 border-brand ring-1 ring-brand/20'
                        : 'border border-border'
                    )}
                  >
                    {tier.recommended && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                        {t('pricing.recommended', locale)}
                      </span>
                    )}

                    <h3 className="text-lg font-bold text-foreground mb-4">{tier.name}</h3>

                    <div className="mb-6">
                      <span className="text-4xl font-extrabold text-foreground">
                        {formatPrice(price)}
                      </span>
                      {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
                    </div>

                    {/* Quotas */}
                    <div className="space-y-2 mb-6 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t('pricing.creditsLabel', locale)}
                        </span>
                        <span className="font-medium text-foreground">{tier.credits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t('pricing.sitesLabel', locale)}
                        </span>
                        <span className="font-medium text-foreground">
                          {tier.sites === 'unlimited' ? t('pricing.unlimited', locale) : tier.sites}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t('pricing.storageLabel', locale)}
                        </span>
                        <span className="font-medium text-foreground">{tier.storage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t('pricing.fileSizeLabel', locale)}
                        </span>
                        <span className="font-medium text-foreground">{tier.fileSize}</span>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-6 flex-1">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check size={16} className="text-brand flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Link
                      to={downloadHref}
                      className={cn(
                        'block w-full text-center py-3 rounded-xl font-medium text-sm transition-all hover:shadow-md',
                        tier.recommended
                          ? 'bg-foreground text-background hover:bg-foreground/90'
                          : 'border border-border text-foreground hover:bg-background'
                      )}
                      data-track-cta={`pricing-${tier.id}`}
                    >
                      {tier.monthly === 0
                        ? t('pricing.getStarted', locale)
                        : t('pricing.upgrade', locale)}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Credit Packs */}
        <section className="px-4 sm:px-6 py-12">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
              {t('pricing.creditPacksTitle', locale)}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              {t('pricing.creditPacksDesc', locale)}
            </p>
            <div className="inline-flex flex-wrap justify-center gap-4">
              {CREDIT_PACKS.map((pack) => (
                <div
                  key={pack.credits}
                  className="rounded-xl border border-border bg-card px-6 py-4 text-center"
                >
                  <span className="block text-lg font-bold text-foreground">
                    {pack.credits.toLocaleString()} {t('pricing.creditPack', locale)}
                  </span>
                  <span className="text-sm text-muted-foreground">${pack.price}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8 tracking-tight">
              {t('pricing.faqTitle', locale)}
            </h2>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="bg-card rounded-2xl p-6 shadow-xs hover:shadow-sm transition-shadow"
                >
                  <h3 className="font-bold text-foreground mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
