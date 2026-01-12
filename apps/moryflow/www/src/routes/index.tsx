import { createFileRoute } from '@tanstack/react-router';
import { generateMeta, siteConfig } from '@/lib/seo';
import { JsonLd, productSchema } from '@/components/seo/JsonLd';
import {
  Hero,
  AgentShowcase,
  CapabilitiesSection,
  WhyLocalSection,
  DownloadCTA,
} from '@/components/landing';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: generateMeta({
      description: siteConfig.description,
      path: '/',
    }),
    links: [{ rel: 'canonical', href: siteConfig.url }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <JsonLd data={productSchema} />
      <main>
        <Hero />
        <AgentShowcase />
        <CapabilitiesSection />
        <WhyLocalSection />
        <DownloadCTA />
      </main>
    </>
  );
}
