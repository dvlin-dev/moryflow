/**
 * Topics Listing Page
 *
 * [INPUT]: None
 * [OUTPUT]: Public topics directory
 * [POS]: /topics - Lists all public digest topics for SEO
 */

import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Header, Footer, Container } from '@/components/layout';
import { TopicsHero, TopicListItem } from '@/components/digest';
import { getPublicTopics, type DigestTopicSummary } from '@/lib/digest-api';
import { usePublicEnv } from '../__root';

export const Route = createFileRoute('/topics/')({
  component: TopicsPage,
  head: () => ({
    meta: [
      { title: 'Discover Topics | Aiget Dev' },
      {
        name: 'description',
        content:
          'Browse AI-curated digest topics. Subscribe to get intelligent content summaries on topics that matter to you.',
      },
      { property: 'og:title', content: 'Discover Topics | Aiget Dev' },
      {
        property: 'og:description',
        content: 'Browse AI-curated digest topics and subscribe to stay informed.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://aiget.dev/topics' }],
  }),
});

function TopicsPage() {
  const env = usePublicEnv();
  const [topics, setTopics] = useState<DigestTopicSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTopics(1);
  }, []);

  async function loadTopics(pageToLoad: number) {
    try {
      setIsLoading(true);
      const result = await getPublicTopics(env.apiUrl, {
        page: pageToLoad,
        limit: 20,
      });

      setTopics((prev) => (pageToLoad === 1 ? result.items : [...prev, ...result.items]));
      setPage(result.page);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load topics');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <TopicsHero />
        <section className="py-12">
          <Container>
            {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}

            {isLoading && topics.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
              </div>
            ) : topics.length === 0 ? (
              <div className="py-12 text-center text-neutral-500">
                No topics available yet. Check back soon!
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {topics.map((topic) => (
                    <TopicListItem key={topic.id} topic={topic} />
                  ))}
                </div>

                {page < totalPages && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={() => loadTopics(page + 1)}
                      disabled={isLoading}
                      className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
