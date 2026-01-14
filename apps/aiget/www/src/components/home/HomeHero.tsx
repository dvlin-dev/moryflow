/**
 * Home Hero Section
 *
 * [PROPS]: None
 * [POS]: Digest-focused hero section for aiget.dev homepage
 */

import { Link } from '@tanstack/react-router';
import { ArrowRight01Icon, Rocket01Icon } from '@hugeicons/core-free-icons';
import { Button, Icon } from '@aiget/ui';
import { Container } from '@/components/layout';

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background py-20 md:py-28 lg:py-32">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Icon icon={Rocket01Icon} className="h-4 w-4" />
            <span>AI-Powered Content Digest</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Stay Informed,
            <br />
            <span className="text-muted-foreground">Not Overwhelmed</span>
          </h1>

          {/* Description */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Subscribe to AI-curated topics. Get intelligent summaries of what matters, delivered
            when you want them. No noise, just insights.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/topics">
              <Button size="lg" className="gap-2">
                Explore Topics
                <Icon icon={ArrowRight01Icon} className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <p className="mt-8 text-sm text-muted-foreground">
            Free tier available. No credit card required.
          </p>
        </div>
      </Container>
    </section>
  );
}
