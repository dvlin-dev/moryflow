/**
 * Topic Panes (Reader)
 *
 * [INPUT]: slug, (optional) editionId
 * [OUTPUT]: list / overview / edition detail panes
 * [POS]: /topic/* 相关路由的中栏与右栏
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { cn } from '@moryflow/ui';
import { MarkdownView } from '@/components/reader/MarkdownView';
import { getEditionById, getTopicBySlug, getTopicEditions } from '@/lib/digest-api';
import { usePublicEnv } from '@/lib/public-env-context';

type TopicPaneProps =
  | { kind: 'list'; slug: string; selectedEditionId: string | null }
  | { kind: 'overview'; slug: string }
  | { kind: 'edition'; slug: string; editionId: string };

type TopicListViewState = 'loading' | 'error' | 'empty' | 'ready';
type TopicEditionViewState = 'loading' | 'error' | 'empty' | 'ready';

function resolveTopicListViewState(params: {
  isLoading: boolean;
  isError: boolean;
  itemCount: number;
}): TopicListViewState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.isError) {
    return 'error';
  }

  if (params.itemCount === 0) {
    return 'empty';
  }

  return 'ready';
}

function resolveTopicEditionViewState(params: {
  isLoading: boolean;
  isError: boolean;
  hasEdition: boolean;
}): TopicEditionViewState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.isError) {
    return 'error';
  }

  if (!params.hasEdition) {
    return 'empty';
  }

  return 'ready';
}

function renderTopicListContentByState(params: {
  state: TopicListViewState;
  slug: string;
  selectedEditionId: string | null;
  editions: Awaited<ReturnType<typeof getTopicEditions>>['items'];
}) {
  switch (params.state) {
    case 'loading':
      return <div className="px-2 py-2 text-sm text-muted-foreground">Loading…</div>;
    case 'error':
      return <div className="px-2 py-2 text-sm text-destructive">Failed to load editions.</div>;
    case 'empty':
      return <div className="px-2 py-2 text-sm text-muted-foreground">No editions yet.</div>;
    case 'ready':
      return (
        <div className="space-y-1">
          {params.editions.map((edition) => {
            const isActive = params.selectedEditionId === edition.id;
            const displayDate = edition.finishedAt ?? edition.scheduledAt;

            return (
              <Link
                key={edition.id}
                to="/topic/$slug/editions/$editionId"
                params={{ slug: params.slug, editionId: edition.id }}
                className={cn(
                  'flex flex-col rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent/60',
                  isActive ? 'bg-accent' : ''
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    {new Date(displayDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">{edition.itemCount} items</span>
                </div>
                {edition.narrativeMarkdown ? (
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {edition.narrativeMarkdown.replaceAll('\n', ' ').slice(0, 120)}
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      );
    default:
      return null;
  }
}

function renderTopicEditionContentByState(params: {
  state: TopicEditionViewState;
  edition: Awaited<ReturnType<typeof getEditionById>> | undefined;
}) {
  switch (params.state) {
    case 'loading':
      return <div className="text-sm text-muted-foreground">Loading…</div>;
    case 'error':
      return <div className="text-sm text-destructive">Failed to load edition.</div>;
    case 'empty':
      return <div className="text-sm text-muted-foreground">No content in this edition.</div>;
    case 'ready': {
      const edition = params.edition;
      if (!edition) {
        return null;
      }

      return (
        <div className="space-y-8">
          {edition.narrativeMarkdown ? (
            <div className="rounded-md border border-border p-4">
              <div className="text-sm font-semibold">Summary</div>
              <div className="prose prose-neutral dark:prose-invert mt-3 max-w-none">
                <MarkdownView markdown={edition.narrativeMarkdown} />
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="text-sm font-semibold">Items</div>
            {edition.items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No items in this edition.</div>
            ) : (
              <div className="space-y-2">
                {edition.items.map((item) => (
                  <a
                    key={item.id}
                    href={item.urlSnapshot}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border border-border p-4 hover:bg-accent/40"
                  >
                    <div className="text-sm font-medium">{item.titleSnapshot}</div>
                    {item.siteName ? (
                      <div className="mt-1 text-xs text-muted-foreground">{item.siteName}</div>
                    ) : null}
                    {item.aiSummarySnapshot ? (
                      <div className="mt-2 text-sm text-muted-foreground">{item.aiSummarySnapshot}</div>
                    ) : null}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

export function TopicPane(props: TopicPaneProps) {
  const env = usePublicEnv();
  const editionId = props.kind === 'edition' ? props.editionId : null;

  const topicQuery = useQuery({
    queryKey: ['digest', 'topic', props.slug],
    queryFn: () => getTopicBySlug(env.apiUrl, props.slug),
  });

  const editionsQuery = useQuery({
    queryKey: ['digest', 'topic', props.slug, 'editions'],
    queryFn: async () => {
      const result = await getTopicEditions(env.apiUrl, props.slug, { limit: 30 });
      return result.items;
    },
  });

  const editionQuery = useQuery({
    queryKey: ['digest', 'topic', props.slug, 'edition', editionId ?? ''],
    queryFn: () => getEditionById(env.apiUrl, props.slug, editionId as string),
    enabled: props.kind === 'edition' && Boolean(editionId),
  });

  const editionDisplayDate = useMemo(() => {
    const edition = editionQuery.data;
    if (!edition) {
      return null;
    }

    return edition.finishedAt ?? edition.scheduledAt;
  }, [editionQuery.data]);

  switch (props.kind) {
    case 'list': {
      const editions = editionsQuery.data ?? [];
      const listViewState = resolveTopicListViewState({
        isLoading: editionsQuery.isLoading,
        isError: editionsQuery.isError,
        itemCount: editions.length,
      });

      return (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <div className="truncate text-sm font-semibold">{topicQuery.data?.title ?? 'Topic'}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Editions</div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {renderTopicListContentByState({
              state: listViewState,
              slug: props.slug,
              selectedEditionId: props.selectedEditionId,
              editions,
            })}
          </div>
        </div>
      );
    }
    case 'overview':
      return (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="text-lg font-semibold">{topicQuery.data?.title ?? 'Topic'}</div>
            {topicQuery.data?.description ? (
              <div className="mt-1 text-sm text-muted-foreground">{topicQuery.data.description}</div>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="text-sm text-muted-foreground">Select an edition to start reading.</div>
          </div>
        </div>
      );
    case 'edition': {
      const editionViewState = resolveTopicEditionViewState({
        isLoading: editionQuery.isLoading,
        isError: editionQuery.isError,
        hasEdition: Boolean(editionQuery.data),
      });

      return (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="text-lg font-semibold">{topicQuery.data?.title ?? 'Topic'}</div>
            {editionDisplayDate ? (
              <div className="mt-1 text-sm text-muted-foreground">
                {new Date(editionDisplayDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {renderTopicEditionContentByState({
              state: editionViewState,
              edition: editionQuery.data,
            })}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
