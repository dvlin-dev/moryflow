/**
 * Topics Listing Page
 *
 * [INPUT]: None
 * [OUTPUT]: Public topics directory
 * [POS]: /topics - Lists all public digest topics for SEO
 */

import { createFileRoute } from '@tanstack/react-router';
import { Header, Footer, Container } from '@/components/layout';
import { TopicsHero, TopicListItem } from '@/components/digest';
import { usePublicTopicsDirectory } from '@/features/public-topics';

type TopicsPageViewState = 'loading' | 'error' | 'empty' | 'ready';

function resolveTopicsPageViewState(
  isInitialLoading: boolean,
  hasTopics: boolean,
  error: string | null
): TopicsPageViewState {
  if (isInitialLoading && !hasTopics) {
    return 'loading';
  }

  if (error && !hasTopics) {
    return 'error';
  }

  if (!hasTopics) {
    return 'empty';
  }

  return 'ready';
}

function renderLoadMoreLabel(isLoadingMore: boolean): string {
  if (isLoadingMore) {
    return 'Loading...';
  }

  return 'Load more';
}

export const Route = createFileRoute('/topics/')({
  component: TopicsPage,
  head: () => ({
    meta: [
      { title: 'Discover Topics | Anyhunt Dev' },
      {
        name: 'description',
        content:
          'Browse AI-curated digest topics. Subscribe to get intelligent content summaries on topics that matter to you.',
      },
      { property: 'og:title', content: 'Discover Topics | Anyhunt Dev' },
      {
        property: 'og:description',
        content: 'Browse AI-curated digest topics and subscribe to stay informed.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://anyhunt.app/topics' }],
  }),
});

function TopicsPage() {
  const { topics, page, totalPages, isInitialLoading, isLoadingMore, error, loadMore } =
    usePublicTopicsDirectory();

  const hasTopics = topics.length > 0;
  const hasMoreTopics = page < totalPages;
  const viewState = resolveTopicsPageViewState(isInitialLoading, hasTopics, error);

  const renderContentByState = () => {
    switch (viewState) {
      case 'loading':
        return (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          </div>
        );
      case 'error':
        return <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;
      case 'empty':
        return <div className="py-12 text-center text-neutral-500">No topics available yet. Check back soon!</div>;
      case 'ready':
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => (
                <TopicListItem key={topic.id} topic={topic} />
              ))}
            </div>

            {hasMoreTopics ? (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => void loadMore()}
                  disabled={isLoadingMore}
                  className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                >
                  {renderLoadMoreLabel(isLoadingMore)}
                </button>
              </div>
            ) : null}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <TopicsHero />
        <section className="py-12">
          <Container>
            {error && hasTopics ? (
              <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
            ) : null}
            {renderContentByState()}
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
