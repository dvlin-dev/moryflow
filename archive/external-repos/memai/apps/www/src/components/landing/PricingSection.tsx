import { Container } from '@/components/layout'
import { Button } from '@memai/ui/primitives'
import { Check } from 'lucide-react'
import { cn } from '@memai/ui/lib'

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for side projects and testing',
    features: [
      '10,000 memories',
      '1,000 API calls/month',
      'Semantic search',
      'Knowledge graph',
      'Entity extraction',
      'Community support',
    ],
    cta: 'Get Started',
    href: 'https://console.memai.dev/signup',
    highlighted: false,
  },
  {
    name: 'Hobby',
    price: '$19',
    period: '/month',
    description: 'For growing teams and production apps',
    features: [
      '50,000 memories',
      '5,000 API calls/month',
      'Everything in Free',
      'Higher rate limits',
      'Webhooks',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    href: 'https://console.memai.dev/signup?plan=hobby',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Pay-as-you-go',
    period: '',
    description: 'For large-scale operations',
    features: [
      'Unlimited memories',
      'Unlimited API calls',
      'Everything in Hobby',
      'Custom SLA (99.99%)',
      '24/7 technical support',
      'Custom features & integrations',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    highlighted: false,
  },
]

export function PricingSection() {
  return (
    <section className="border-b border-border bg-muted/30 py-20 md:py-28">
      <Container>
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">
            PRICING
          </h2>
          <p className="mt-4 text-muted-foreground">
            Simple, transparent pricing that scales with you
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                'flex flex-col border bg-card p-6',
                tier.highlighted
                  ? 'border-foreground'
                  : 'border-border'
              )}
            >
              {/* Tier Header */}
              <div>
                <h3 className="font-mono text-lg font-semibold">{tier.name}</h3>
                <div className="mt-3 flex items-baseline">
                  <span className="font-mono text-4xl font-bold">{tier.price}</span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    {tier.period}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </div>

              {/* Features */}
              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
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
  )
}
