/**
 * Explore Topics Pane
 *
 * [INPUT]: query (from URL)
 * [OUTPUT]: Explore workbench UI
 * [POS]: /explore 右侧主区域
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Input } from '@moryflow/ui';
import { toast } from 'sonner';
import { getPublicTopics } from '@/lib/digest-api';
import { usePublicEnv } from '@/lib/public-env-context';
import { useAuthStore } from '@/stores/auth-store';
import { ExploreCreateDialog } from './ExploreCreateDialog';
import {
  ExploreTopicsContent,
  type ExploreTopicsContentActions,
  type ExploreTopicsContentModel,
} from './ExploreTopicsContent';
import { TopicPreviewDialog } from './TopicPreviewDialog';
import { followPublicTopic } from './explore.actions';
import { getErrorMessageOrFallback, isUnauthorizedApiError } from './explore-error-guards';

interface ExploreTopicsPaneProps {
  query?: string;
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

  useEffect(() => {
    setDraft(query ?? '');
  }, [query]);

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

  const searchResultsQuery = useQuery({
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

  const handleOpenCreateDialog = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const handlePreviewTopic = useCallback((slug: string) => {
    setPreviewSlug(slug);
  }, []);

  const handleFollow = useCallback(
    async (slug: string) => {
      if (!isAuthenticated) {
        await navigate({ to: '/login', search: { redirect: pathname + searchStr } });
        return;
      }

      try {
        await followPublicTopic(slug);
        toast.success('Followed');
      } catch (error) {
        if (isUnauthorizedApiError(error)) {
          await navigate({ to: '/login', search: { redirect: pathname + searchStr } });
          return;
        }

        toast.error(getErrorMessageOrFallback(error, 'Failed to follow'));
      }
    },
    [isAuthenticated, navigate, pathname, searchStr]
  );

  const handleFollowTopic = useCallback(
    (slug: string) => {
      void handleFollow(slug);
    },
    [handleFollow]
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void navigate({ to: '/explore', search: { q: draft.trim() || undefined } });
  };

  const contentModel = useMemo<ExploreTopicsContentModel>(
    () => ({
      mode: hasSearch ? 'search' : 'trending',
      createRowLabel,
      search: {
        topics: searchResultsQuery.data ?? [],
        error: searchResultsQuery.error,
        isLoading: searchResultsQuery.isLoading,
        isError: searchResultsQuery.isError,
      },
      trending: {
        topics: trendingQuery.data ?? [],
        error: trendingQuery.error,
        isLoading: trendingQuery.isLoading,
        isError: trendingQuery.isError,
      },
    }),
    [
      createRowLabel,
      hasSearch,
      searchResultsQuery.data,
      searchResultsQuery.error,
      searchResultsQuery.isError,
      searchResultsQuery.isLoading,
      trendingQuery.data,
      trendingQuery.error,
      trendingQuery.isError,
      trendingQuery.isLoading,
    ]
  );

  const contentActions = useMemo<ExploreTopicsContentActions>(
    () => ({
      onOpenCreateDialog: handleOpenCreateDialog,
      onPreviewTopic: handlePreviewTopic,
      onFollowTopic: handleFollowTopic,
    }),
    [handleFollowTopic, handleOpenCreateDialog, handlePreviewTopic]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <div className="text-lg font-semibold">Explore topics</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Search topics to follow, or create your own subscription.
        </div>

        <form className="mt-4 flex gap-2" onSubmit={handleSearchSubmit}>
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search topics…"
          />
          <Button type="submit">Search</Button>
          <Button type="button" variant="secondary" onClick={handleOpenCreateDialog}>
            Create
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <ExploreTopicsContent model={contentModel} actions={contentActions} />
      </div>

      <ExploreCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialQuery={(draft || normalizedQuery).trim()}
        onCreated={(topicSlug) => navigate({ to: '/topic/$slug', params: { slug: topicSlug } })}
      />

      <TopicPreviewDialog
        open={Boolean(previewSlug)}
        onOpenChange={(open) => setPreviewSlug((prev) => (open ? prev : null))}
        slug={previewSlug}
      />
    </div>
  );
}
