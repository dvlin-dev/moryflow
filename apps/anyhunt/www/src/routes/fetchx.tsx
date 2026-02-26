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
} from '@/components/landing';

export const Route = createFileRoute('/fetchx')({
  component: FetchxPage,
});

function FetchxPage() {
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
