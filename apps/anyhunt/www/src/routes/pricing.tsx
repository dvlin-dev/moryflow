/**
 * [PROPS]: None
 * [EMITS]: Navigation to signup / contact
 * [POS]: Anyhunt Dev Pricing 页面 - 定价方案展示（Lucide icons direct render）
 */

import { createFileRoute } from '@tanstack/react-router';
import { Check, ChevronRight, CircleQuestionMark } from 'lucide-react';
import { Header, Footer, Container } from '@/components/layout';
import { Button } from '@anyhunt/ui';
import { cn } from '@anyhunt/ui/lib';
import { PRICING_TIERS, PRICING_FAQS } from '@/lib/pricing';

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border bg-background py-16 md:py-20">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:24px_24px]" />
          <Container className="relative">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="font-mono text-4xl font-bold tracking-tight md:text-5xl">Pricing</h1>
              <p className="mt-5 text-lg text-muted-foreground md:text-xl">
                Simple, transparent pricing that scales with you.
                <br />
                Start free, upgrade when you need.
              </p>
            </div>
          </Container>
        </section>

        {/* Pricing Tiers */}
        <section className="border-b border-border bg-muted/30 py-16 md:py-20">
          <Container>
            <div className="grid gap-6 md:grid-cols-3">
              {PRICING_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={cn(
                    'flex flex-col rounded-lg border bg-card p-6',
                    tier.highlighted ? 'border-foreground ring-1 ring-foreground' : 'border-border'
                  )}
                >
                  {tier.highlighted && (
                    <div className="mb-4 -mt-3 -mx-3">
                      <span className="inline-block rounded-t-lg bg-foreground px-3 py-1 text-xs font-medium text-background">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Tier Header */}
                  <div>
                    <h3 className="font-mono text-lg font-semibold">{tier.name}</h3>
                    <div className="mt-3 flex items-baseline">
                      <span className="font-mono text-4xl font-bold">{tier.price}</span>
                      <span className="ml-1 text-sm text-muted-foreground">{tier.period}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
                  </div>

                  {/* Features */}
                  <ul className="mt-6 flex-1 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <a href={tier.href} className="mt-6 block">
                    <Button
                      variant={tier.highlighted ? 'default' : 'outline'}
                      className="w-full font-mono"
                    >
                      {tier.cta}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* FAQ Section */}
        <section className="border-b border-border py-16 md:py-20">
          <Container>
            <div className="mx-auto max-w-3xl">
              <h2 className="font-mono text-2xl font-bold tracking-tight text-center md:text-3xl">
                FAQ
              </h2>
              <div className="mt-10 space-y-6">
                {PRICING_FAQS.map((faq) => (
                  <div key={faq.question} className="border border-border rounded-lg p-5">
                    <h3 className="flex items-center gap-2 font-medium">
                      <CircleQuestionMark className="h-4 w-4 text-muted-foreground" />
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-mono text-2xl font-bold tracking-tight md:text-3xl">
                Ready to get started?
              </h2>
              <p className="mt-4 text-muted-foreground">
                Join thousands of developers building with Anyhunt.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild className="font-mono">
                  <a
                    href="https://console.anyhunt.app/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Start for Free
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="font-mono">
                  <a href="https://docs.anyhunt.app" target="_blank" rel="noopener noreferrer">
                    Read the Docs
                  </a>
                </Button>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
