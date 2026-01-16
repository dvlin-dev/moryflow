/**
 * Topic Detail Page
 *
 * [INPUT]: slug param
 * [OUTPUT]: Topic detail with editions list
 * [POS]: /topics/:slug - Single topic page for SEO
 */

import { useState, useEffect } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft01Icon,
  UserMultipleIcon,
  Calendar01Icon,
  Flag01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Header, Footer, Container } from '@/components/layout';
import { EditionListItem, ReportTopicDialog } from '@/components/digest';
import {
  getTopicBySlug,
  getTopicEditions,
  type DigestTopicDetail,
  type DigestEditionSummary,
} from '@/lib/digest-api';
import { usePublicEnv } from '@/lib/public-env-context';

export const Route = createFileRoute('/topics/$slug/')({
  component: TopicDetailPage,
});

function TopicDetailPage() {
  const { slug } = Route.useParams();
  const env = usePublicEnv();
  const [topic, setTopic] = useState<DigestTopicDetail | null>(null);
  const [editions, setEditions] = useState<DigestEditionSummary[]>([]);
  const [editionsPage, setEditionsPage] = useState(1);
  const [editionsTotalPages, setEditionsTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  useEffect(() => {
    loadTopic();
  }, [slug]);

  async function loadTopic() {
    try {
      setIsLoading(true);
      const [topicData, editionsData] = await Promise.all([
        getTopicBySlug(env.apiUrl, slug),
        getTopicEditions(env.apiUrl, slug, { page: 1, limit: 10 }),
      ]);
      setTopic(topicData);
      setEditions(editionsData.items);
      setEditionsPage(editionsData.page);
      setEditionsTotalPages(editionsData.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load topic');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMoreEditions() {
    if (editionsPage >= editionsTotalPages) return;
    try {
      setIsLoading(true);
      const nextPage = editionsPage + 1;
      const result = await getTopicEditions(env.apiUrl, slug, {
        page: nextPage,
        limit: 10,
      });
      setEditions((prev) => [...prev, ...result.items]);
      setEditionsPage(result.page);
      setEditionsTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more editions');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading && !topic) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="flex min-h-screen flex-col">
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
                <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
                Back to topics
              </Link>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Topic Header */}
        <section className="border-b border-neutral-200 bg-gradient-to-b from-neutral-50 to-white py-12">
          <Container>
            <Link
              to="/topics"
              className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
              Back to topics
            </Link>

            <div className="flex items-start justify-between gap-6">
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-neutral-900">{topic.title}</h1>
                {topic.description && (
                  <p className="max-w-2xl text-lg text-neutral-600">{topic.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-neutral-500">
                  <span className="flex items-center gap-1">
                    <HugeiconsIcon icon={UserMultipleIcon} className="h-4 w-4" />
                    {topic.subscriberCount} subscribers
                  </span>
                  {topic.lastEditionAt && (
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={Calendar01Icon} className="h-4 w-4" />
                      Last updated{' '}
                      {new Date(topic.lastEditionAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                {topic.interests.length > 0 && (
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
                )}
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
                  <HugeiconsIcon icon={Flag01Icon} className="h-4 w-4" />
                  <span className="sr-only">Report</span>
                </button>
              </div>
            </div>
          </Container>
        </section>

        {/* Editions List */}
        <section className="py-12">
          <Container>
            <h2 className="mb-6 text-xl font-semibold text-neutral-900">Past Editions</h2>

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

                {editionsPage < editionsTotalPages && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={loadMoreEditions}
                      disabled={isLoading}
                      className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : 'Load more editions'}
                    </button>
                  </div>
                )}
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
    </div>
  );
}
