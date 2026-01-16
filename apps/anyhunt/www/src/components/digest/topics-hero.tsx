/**
 * Topics Hero Section
 *
 * [PROPS]: none
 * [POS]: Hero section for the public topics listing page
 */

import { Container } from '@/components/layout';

export function TopicsHero() {
  return (
    <section className="border-b border-neutral-200 bg-gradient-to-b from-neutral-50 to-white py-16">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900">Discover Topics</h1>
          <p className="mt-4 text-lg text-neutral-600">
            Browse curated AI-powered digests on topics that matter. Subscribe to stay informed with
            intelligent content summaries delivered to your inbox.
          </p>
        </div>
      </Container>
    </section>
  );
}
