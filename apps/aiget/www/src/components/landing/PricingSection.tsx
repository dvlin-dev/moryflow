import { Tick02Icon } from '@hugeicons/core-free-icons';
import { Container } from '@/components/layout';
import { Button, Icon } from '@aiget/ui';
import { cn } from '@aiget/ui/lib';
import { PRICING_TIERS } from '@/lib/pricing';

export function PricingSection() {
  return (
    <section className="border-b border-border bg-muted/30 py-20 md:py-28">
      <Container>
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">PRICING</h2>
          <p className="mt-4 text-muted-foreground">
            Simple, transparent pricing that scales with you
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                'flex flex-col border bg-card p-6',
                tier.highlighted ? 'border-foreground' : 'border-border'
              )}
            >
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
                    <Icon icon={Tick02Icon} className="mt-0.5 h-4 w-4 shrink-0" />
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
                </Button>
              </a>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
