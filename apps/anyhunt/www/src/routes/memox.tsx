import { createFileRoute } from '@tanstack/react-router';
import { MarketingPageShell } from '@/components/layout';
import {
  HeroSection,
  StatsSection,
  UseCasesSection,
  CodeExampleSection,
  FeaturesSection,
  PricingSection,
  CTASection,
} from '@/components/memox/landing';

export const Route = createFileRoute('/memox')({
  component: MemoxPage,
});

function MemoxPage() {
  return (
    <MarketingPageShell>
      <HeroSection />
      <StatsSection />
      <UseCasesSection />
      <CodeExampleSection />
      <FeaturesSection />
      <PricingSection />
      <CTASection />
    </MarketingPageShell>
  );
}
