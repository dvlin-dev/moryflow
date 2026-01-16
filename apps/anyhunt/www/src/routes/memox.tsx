import { createFileRoute } from '@tanstack/react-router';
import { Header, Footer } from '@/components/layout';
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <UseCasesSection />
        <CodeExampleSection />
        <FeaturesSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
