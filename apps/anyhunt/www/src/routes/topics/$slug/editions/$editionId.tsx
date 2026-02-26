/**
 * Edition Detail Page
 *
 * [INPUT]: slug, editionId params
 * [OUTPUT]: Full edition content with all items
 * [POS]: /topics/:slug/editions/:editionId - Single edition page for SEO (Lucide icons direct render)
 */

import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, Calendar, Newspaper } from 'lucide-react';
import { Header, Footer, Container } from '@/components/layout';
import { EditionContentItem } from '@/components/digest';
import { usePublicEditionDetail } from '@/features/public-topics';
import { resolveEditionDetailViewState } from '@/features/public-topics/edition-view-state';

export const Route = createFileRoute('/topics/$slug/editions/$editionId')({
  component: EditionDetailPage,
});

function EditionDetailPage() {
  const { slug, editionId } = Route.useParams();
  const { edition, isLoading, error } = usePublicEditionDetail(slug, editionId);

  const viewState = resolveEditionDetailViewState({
    isLoading,
    hasEdition: Boolean(edition),
    hasError: Boolean(error),
  });

  const renderContentByState = () => {
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
                  <h1 className="text-2xl font-bold text-neutral-900">Edition not found</h1>
                  <p className="mt-2 text-neutral-600">
                    {error || 'The edition you are looking for does not exist.'}
                  </p>
                  <Link
                    to="/topics/$slug"
                    params={{ slug }}
                    className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to topic
                  </Link>
                </div>
              </Container>
            </main>
            <Footer />
          </>
        );
      case 'ready': {
        if (!edition) return null;

        const displayDate = edition.finishedAt ?? edition.scheduledAt;

        return (
          <>
            <Header />
            <main className="flex-1">
              <section className="border-b border-neutral-200 bg-gradient-to-b from-neutral-50 to-white py-12">
                <Container>
                  <Link
                    to="/topics/$slug"
                    params={{ slug }}
                    className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to topic
                  </Link>

                  <h1 className="text-3xl font-bold text-neutral-900">Edition</h1>

                  <div className="mt-3 flex items-center gap-4 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(displayDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Newspaper className="h-4 w-4" />
                      {edition.itemCount} items
                    </span>
                  </div>
                </Container>
              </section>

              {edition.narrativeMarkdown ? (
                <section className="border-b border-neutral-200 bg-white py-8">
                  <Container>
                    <div className="mx-auto max-w-3xl">
                      <h2 className="mb-4 text-lg font-semibold text-neutral-900">Summary</h2>
                      <div className="prose prose-neutral max-w-none">
                        {edition.narrativeMarkdown.split('\n').map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </Container>
                </section>
              ) : null}

              <section className="py-12">
                <Container>
                  <h2 className="mb-6 text-xl font-semibold text-neutral-900">Featured Content</h2>

                  {edition.items.length === 0 ? (
                    <div className="py-8 text-center text-neutral-500">No items in this edition.</div>
                  ) : (
                    <div className="space-y-4">
                      {edition.items.map((item) => (
                        <EditionContentItem key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </Container>
              </section>

              <section className="border-t border-neutral-200 bg-neutral-50 py-12">
                <Container>
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-neutral-900">Stay Updated</h2>
                    <p className="mt-2 text-neutral-600">
                      Subscribe to get new editions delivered to your inbox.
                    </p>
                    <a
                      href={`https://console.anyhunt.app/digest/follow/${slug}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                    >
                      Subscribe to this topic
                    </a>
                  </div>
                </Container>
              </section>
            </main>
            <Footer />
          </>
        );
      }
      default:
        return null;
    }
  };

  return <div className="flex min-h-screen flex-col">{renderContentByState()}</div>;
}
