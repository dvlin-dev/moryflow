/**
 * Explore Topics Pane
 *
 * [INPUT]: query (from URL)
 * [OUTPUT]: Explore workbench UI
 * [POS]: /explore 右侧主区域
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Input } from '@anyhunt/ui';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api-client';
import { getPublicTopics, type DigestTopicSummary } from '@/lib/digest-api';
import { usePublicEnv } from '@/lib/public-env-context';
import { ExploreCreateDialog } from './ExploreCreateDialog';
import { TopicPreviewDialog } from './TopicPreviewDialog';
import { followPublicTopic } from './explore.actions';
import { useAuthStore } from '@/stores/auth-store';

interface ExploreTopicsPaneProps {
  query?: string;
}

function TopicCard({
  topic,
  onPreview,
  onFollow,
}: {
  topic: DigestTopicSummary;
  onPreview: () => void;
  onFollow: () => void;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/topic/$slug" params={{ slug: topic.slug }} className="text-sm font-medium">
            {topic.title}
          </Link>
          {topic.description ? (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {topic.description}
            </div>
          ) : null}
          <div className="mt-2 text-xs text-muted-foreground">
            {topic.subscriberCount} followers
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onPreview}>
            Preview
          </Button>
          <Button type="button" size="sm" onClick={onFollow}>
            Follow
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ExploreTopicsPane({ query }: ExploreTopicsPaneProps) {
  const env = usePublicEnv();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });

  const [draft, setDraft] = useState(query ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  useEffect(() => setDraft(query ?? ''), [query]);

  const hasSearch = Boolean(query && query.trim());
  const normalizedQuery = useMemo(() => (query ?? '').trim(), [query]);

  const trendingQuery = useQuery({
    queryKey: ['digest', 'topics', 'trending'],
    queryFn: async () => {
      const result = await getPublicTopics(env.apiUrl, { sort: 'trending', limit: 12 });
      return result.items;
    },
    enabled: !hasSearch,
  });

  const resultsQuery = useQuery({
    queryKey: ['digest', 'topics', 'search', normalizedQuery],
    queryFn: async () => {
      const result = await getPublicTopics(env.apiUrl, {
        sort: 'trending',
        search: normalizedQuery,
        limit: 20,
      });
      return result.items;
    },
    enabled: hasSearch,
  });

  const createRowLabel = normalizedQuery ? `Create subscription for "${normalizedQuery}"` : null;

  const handleFollow = async (slug: string) => {
    if (!isAuthenticated) {
      await navigate({ to: '/login', search: { redirect: pathname + searchStr } });
      return;
    }

    try {
      await followPublicTopic(slug);
      toast.success('Followed');
    } catch (error) {
      if (error instanceof ApiClientError && error.isUnauthorized) {
        await navigate({ to: '/login', search: { redirect: pathname + searchStr } });
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Failed to follow');
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <div className="text-lg font-semibold">Explore topics</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Search topics to follow, or create your own subscription.
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ to: '/explore', search: { q: draft.trim() || undefined } });
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search topics…"
          />
          <Button type="submit">Search</Button>
          <Button type="button" variant="secondary" onClick={() => setCreateOpen(true)}>
            Create
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {hasSearch ? (
          <div className="space-y-3">
            {createRowLabel ? (
              <div className="rounded-md border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{createRowLabel}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Publish as a topic so others can follow.
                    </div>
                  </div>
                  <Button type="button" onClick={() => setCreateOpen(true)}>
                    Create
                  </Button>
                </div>
              </div>
            ) : null}

            {resultsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : resultsQuery.isError ? (
              <div className="text-sm text-destructive">
                {resultsQuery.error instanceof Error
                  ? resultsQuery.error.message
                  : 'Failed to load results.'}
              </div>
            ) : (resultsQuery.data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No results.</div>
            ) : (
              <div className="space-y-2">
                {(resultsQuery.data ?? []).map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    onPreview={() => setPreviewSlug(topic.slug)}
                    onFollow={() => void handleFollow(topic.slug)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-semibold">Trending</div>
            {trendingQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : trendingQuery.isError ? (
              <div className="text-sm text-destructive">
                {trendingQuery.error instanceof Error
                  ? trendingQuery.error.message
                  : 'Failed to load topics.'}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {(trendingQuery.data ?? []).map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    onPreview={() => setPreviewSlug(topic.slug)}
                    onFollow={() => void handleFollow(topic.slug)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ExploreCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialQuery={(draft || normalizedQuery).trim()}
        onCreated={(topicSlug) => navigate({ to: '/topic/$slug', params: { slug: topicSlug } })}
      />

      <TopicPreviewDialog
        open={Boolean(previewSlug)}
        onOpenChange={(open) => setPreviewSlug(open ? previewSlug : null)}
        slug={previewSlug}
      />
    </div>
  );
}
