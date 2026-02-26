/**
 * [PROPS]: explore mode, query/trending states, callbacks
 * [POS]: Explore topics content area (state rendering + topic cards)
 */

import { Link } from '@tanstack/react-router';
import { Button } from '@moryflow/ui';
import type { DigestTopicSummary } from '@/lib/digest-api';

type ExploreSearchContentState = 'loading' | 'error' | 'empty' | 'ready';
type ExploreTrendingContentState = 'loading' | 'error' | 'empty' | 'ready';

interface ExploreTopicsContentProps {
  hasSearch: boolean;
  createRowLabel: string | null;
  searchTopics: DigestTopicSummary[];
  searchError: unknown;
  searchLoading: boolean;
  searchErrorState: boolean;
  trendingTopics: DigestTopicSummary[];
  trendingError: unknown;
  trendingLoading: boolean;
  trendingErrorState: boolean;
  onOpenCreateDialog: () => void;
  onPreviewTopic: (slug: string) => void;
  onFollowTopic: (slug: string) => void;
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
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{topic.description}</div>
          ) : null}
          <div className="mt-2 text-xs text-muted-foreground">{topic.subscriberCount} followers</div>
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

function resolveSearchContentState(params: {
  isLoading: boolean;
  isError: boolean;
  count: number;
}): ExploreSearchContentState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.isError) {
    return 'error';
  }

  if (params.count === 0) {
    return 'empty';
  }

  return 'ready';
}

function resolveTrendingContentState(params: {
  isLoading: boolean;
  isError: boolean;
  count: number;
}): ExploreTrendingContentState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.isError) {
    return 'error';
  }

  if (params.count === 0) {
    return 'empty';
  }

  return 'ready';
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function renderSearchContentByState(props: {
  state: ExploreSearchContentState;
  topics: DigestTopicSummary[];
  error: unknown;
  createRowLabel: string | null;
  onOpenCreateDialog: () => void;
  onPreviewTopic: (slug: string) => void;
  onFollowTopic: (slug: string) => void;
}) {
  switch (props.state) {
    case 'loading':
      return <div className="text-sm text-muted-foreground">Loading…</div>;
    case 'error':
      return (
        <div className="text-sm text-destructive">
          {getErrorMessage(props.error, 'Failed to load results.')}
        </div>
      );
    case 'empty':
      return <div className="text-sm text-muted-foreground">No results.</div>;
    case 'ready':
      return (
        <>
          {props.createRowLabel ? (
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{props.createRowLabel}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Publish as a topic so others can follow.
                  </div>
                </div>
                <Button type="button" onClick={props.onOpenCreateDialog}>
                  Create
                </Button>
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            {props.topics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onPreview={() => props.onPreviewTopic(topic.slug)}
                onFollow={() => props.onFollowTopic(topic.slug)}
              />
            ))}
          </div>
        </>
      );
    default:
      return null;
  }
}

function renderTrendingContentByState(props: {
  state: ExploreTrendingContentState;
  topics: DigestTopicSummary[];
  error: unknown;
  onPreviewTopic: (slug: string) => void;
  onFollowTopic: (slug: string) => void;
}) {
  switch (props.state) {
    case 'loading':
      return <div className="text-sm text-muted-foreground">Loading…</div>;
    case 'error':
      return (
        <div className="text-sm text-destructive">
          {getErrorMessage(props.error, 'Failed to load topics.')}
        </div>
      );
    case 'empty':
      return <div className="text-sm text-muted-foreground">No topics yet.</div>;
    case 'ready':
      return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {props.topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onPreview={() => props.onPreviewTopic(topic.slug)}
              onFollow={() => props.onFollowTopic(topic.slug)}
            />
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function ExploreTopicsContent({
  hasSearch,
  createRowLabel,
  searchTopics,
  searchError,
  searchLoading,
  searchErrorState,
  trendingTopics,
  trendingError,
  trendingLoading,
  trendingErrorState,
  onOpenCreateDialog,
  onPreviewTopic,
  onFollowTopic,
}: ExploreTopicsContentProps) {
  const searchState = resolveSearchContentState({
    isLoading: searchLoading,
    isError: searchErrorState,
    count: searchTopics.length,
  });

  const trendingState = resolveTrendingContentState({
    isLoading: trendingLoading,
    isError: trendingErrorState,
    count: trendingTopics.length,
  });

  if (hasSearch) {
    return (
      <div className="space-y-3">
        {renderSearchContentByState({
          state: searchState,
          topics: searchTopics,
          error: searchError,
          createRowLabel,
          onOpenCreateDialog,
          onPreviewTopic,
          onFollowTopic,
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Trending</div>
      {renderTrendingContentByState({
        state: trendingState,
        topics: trendingTopics,
        error: trendingError,
        onPreviewTopic,
        onFollowTopic,
      })}
    </div>
  );
}
