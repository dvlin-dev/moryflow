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
import { cn } from '@anyhunt/ui';
import { MarkdownView } from '@/components/reader/MarkdownView';
import { getEditionById, getTopicBySlug, getTopicEditions } from '@/lib/digest-api';
import { usePublicEnv } from '@/lib/public-env-context';

type TopicPaneKind = 'list' | 'overview' | 'edition';

type TopicPaneProps =
  | { kind: 'list'; slug: string; selectedEditionId: string | null }
  | { kind: 'overview'; slug: string }
  | { kind: 'edition'; slug: string; editionId: string };

export function TopicPane(props: TopicPaneProps) {
  const env = usePublicEnv();

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

  if (props.kind === 'list') {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="truncate text-sm font-semibold">{topicQuery.data?.title ?? 'Topic'}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Editions</div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {editionsQuery.isLoading ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">Loading…</div>
          ) : (editionsQuery.data ?? []).length === 0 ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">No editions yet.</div>
          ) : (
            <div className="space-y-1">
              {(editionsQuery.data ?? []).map((edition) => {
                const isActive = props.selectedEditionId === edition.id;
                const displayDate = edition.finishedAt ?? edition.scheduledAt;
                return (
                  <Link
                    key={edition.id}
                    to="/topic/$slug/editions/$editionId"
                    params={{ slug: props.slug, editionId: edition.id }}
                    className={cn(
                      'flex flex-col rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent/60',
                      isActive ? 'bg-accent' : ''
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'font-medium',
                          isActive ? 'text-foreground' : 'text-foreground'
                        )}
                      >
                        {new Date(displayDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {edition.itemCount} items
                      </span>
                    </div>
                    {edition.narrativeMarkdown ? (
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {edition.narrativeMarkdown.replaceAll('\\n', ' ').slice(0, 120)}
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (props.kind === 'overview') {
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
  }

  const editionQuery = useQuery({
    queryKey: ['digest', 'topic', props.slug, 'edition', props.editionId],
    queryFn: () => getEditionById(env.apiUrl, props.slug, props.editionId),
  });

  const displayDate = useMemo(() => {
    const e = editionQuery.data;
    if (!e) return null;
    return e.finishedAt ?? e.scheduledAt;
  }, [editionQuery.data]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <div className="text-lg font-semibold">{topicQuery.data?.title ?? 'Topic'}</div>
        {displayDate ? (
          <div className="mt-1 text-sm text-muted-foreground">
            {new Date(displayDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {editionQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : editionQuery.isError || !editionQuery.data ? (
          <div className="text-sm text-destructive">Failed to load edition.</div>
        ) : (
          <div className="space-y-8">
            {editionQuery.data.narrativeMarkdown ? (
              <div className="rounded-md border border-border p-4">
                <div className="text-sm font-semibold">Summary</div>
                <div className="prose prose-neutral dark:prose-invert mt-3 max-w-none">
                  <MarkdownView markdown={editionQuery.data.narrativeMarkdown} />
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="text-sm font-semibold">Items</div>
              {editionQuery.data.items.length === 0 ? (
                <div className="text-sm text-muted-foreground">No items in this edition.</div>
              ) : (
                <div className="space-y-2">
                  {editionQuery.data.items.map((item) => (
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
                        <div className="mt-2 text-sm text-muted-foreground">
                          {item.aiSummarySnapshot}
                        </div>
                      ) : null}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
