/**
 * Topic Detail Page
 *
 * [INPUT]: slug param
 * [OUTPUT]: Topic detail with editions list
 * [POS]: /topics/:slug - Single topic page for SEO (Lucide icons direct render)
 */

import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, Users, Calendar, Flag } from 'lucide-react';
import { Header, Footer, Container } from '@/components/layout';
import { EditionListItem, ReportTopicDialog } from '@/components/digest';
import { usePublicTopicDetail } from '@/features/public-topics';
import { usePublicEnv } from '@/lib/public-env-context';

type TopicDetailViewState = 'loading' | 'error' | 'ready';

function resolveTopicDetailViewState(
  topicExists: boolean,
  isInitialLoading: boolean
): TopicDetailViewState {
  if (isInitialLoading && !topicExists) {
    return 'loading';
  }

  if (!topicExists) {
    return 'error';
  }

  return 'ready';
}

function renderLoadMoreEditionsLabel(isLoading: boolean): string {
  if (isLoading) {
    return 'Loading...';
  }

  return 'Load more editions';
}

export const Route = createFileRoute('/topics/$slug/')({
  component: TopicDetailPage,
});

function TopicDetailPage() {
  const { slug } = Route.useParams();
  const env = usePublicEnv();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const {
    topic,
    editions,
    editionsPage,
    editionsTotalPages,
    isInitialLoading,
    isLoadingMoreEditions,
    error,
    loadMoreEditions,
  } = usePublicTopicDetail(slug);

  const viewState = resolveTopicDetailViewState(Boolean(topic), isInitialLoading);

  const renderPageContentByState = () => {
    switch (viewState) {
      case 'loading':
        return (
          <>
            <Header />
            <main className="flex flex-1 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
            </main>
            <Footer />
          </>
        );
      case 'error':
        return (
          <>
            <Header />
            <main className="flex-1">
              <Container className="py-12">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-neutral-900">Topic not found</h1>
                  <p className="mt-2 text-neutral-600">
                    {error || 'The topic you are looking for does not exist.'}
                  </p>
                  <Link
                    to="/topics"
                    className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to topics
                  </Link>
                </div>
              </Container>
            </main>
            <Footer />
          </>
        );
      case 'ready': {
        if (!topic) return null;

        return (
          <>
            <Header />
            <main className="flex-1">
              <section className="border-b border-neutral-200 bg-gradient-to-b from-neutral-50 to-white py-12">
                <Container>
                  <Link
                    to="/topics"
                    className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to topics
                  </Link>

                  <div className="flex items-start justify-between gap-6">
                    <div className="space-y-3">
                      <h1 className="text-3xl font-bold text-neutral-900">{topic.title}</h1>
                      {topic.description ? (
                        <p className="max-w-2xl text-lg text-neutral-600">{topic.description}</p>
                      ) : null}
                      <div className="flex items-center gap-4 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {topic.subscriberCount} subscribers
                        </span>
                        {topic.lastEditionAt ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Last updated{' '}
                            {new Date(topic.lastEditionAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        ) : null}
                      </div>

                      {topic.interests.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {topic.interests.map((interest) => (
                            <span
                              key={interest}
                              className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <a
                        href={`https://console.anyhunt.app/digest/follow/${topic.slug}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                      >
                        Subscribe to this topic
                      </a>
                      <button
                        onClick={() => setReportDialogOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                        title="Report this topic"
                      >
                        <Flag className="h-4 w-4" />
                        <span className="sr-only">Report</span>
                      </button>
                    </div>
                  </div>
                </Container>
              </section>

              <section className="py-12">
                <Container>
                  <h2 className="mb-6 text-xl font-semibold text-neutral-900">Past Editions</h2>

                  {error ? <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">{error}</div> : null}

                  {editions.length === 0 ? (
                    <div className="py-8 text-center text-neutral-500">
                      No editions published yet. Subscribe to get notified when new editions are
                      available.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {editions.map((edition) => (
                          <EditionListItem key={edition.id} edition={edition} topicSlug={slug} />
                        ))}
                      </div>

                      {editionsPage < editionsTotalPages ? (
                        <div className="mt-8 flex justify-center">
                          <button
                            onClick={() => void loadMoreEditions()}
                            disabled={isLoadingMoreEditions}
                            className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                          >
                            {renderLoadMoreEditionsLabel(isLoadingMoreEditions)}
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </Container>
              </section>
            </main>
            <Footer />

            <ReportTopicDialog
              topicSlug={slug}
              apiUrl={env.apiUrl}
              open={reportDialogOpen}
              onOpenChange={setReportDialogOpen}
            />
          </>
        );
      }
      default:
        return null;
    }
  };

  return <div className="flex min-h-screen flex-col">{renderPageContentByState()}</div>;
}
