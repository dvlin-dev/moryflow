import { Container } from '@/components/layout';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Button, Icon } from '@aiget/ui';

export function CTASection() {
  return (
    <section className="py-20 md:py-28">
      <Container size="narrow">
        <div className="border border-border bg-card p-8 text-center md:p-12">
          <h2 className="font-mono text-2xl font-bold tracking-tight md:text-3xl">
            READY TO GET STARTED?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start building AI memory in minutes. No credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="https://console.aiget.dev/signup">
              <Button size="lg" className="font-mono">
                Create Free Account
                <Icon icon={ArrowRight01Icon} className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="https://server.aiget.dev/api-docs" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" className="font-mono">
                View Documentation
              </Button>
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
