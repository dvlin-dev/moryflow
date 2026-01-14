/**
 * Home CTA Section
 *
 * [PROPS]: None
 * [POS]: Final call-to-action section on homepage
 */

import { Link } from '@tanstack/react-router';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Button, Icon } from '@aiget/ui';
import { Container } from '@/components/layout';

export function HomeCTA() {
  return (
    <section className="py-20 md:py-24">
      <Container>
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Ready to Stay Informed?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join thousands of professionals who use Digest to cut through the noise and focus on
            what matters.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Get Started Free
                <Icon icon={ArrowRight01Icon} className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/topics">
              <Button size="lg" variant="outline">
                Browse Topics
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
