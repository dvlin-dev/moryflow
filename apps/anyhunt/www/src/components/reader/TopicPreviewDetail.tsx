/**
 * [PROPS]: slug, followedTopicIds, onFollowTopic
 * [POS]: Reader 右栏 - Topic 预览（不跳转到 /topics/*）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, Icon, ScrollArea, Skeleton } from '@anyhunt/ui';
import {
  SquareArrowUpRightIcon,
  UserMultiple02Icon,
  Calendar01Icon,
} from '@hugeicons/core-free-icons';
import { usePublicEnv } from '@/lib/public-env-context';
import {
  getTopicBySlug,
  getTopicEditions,
  type DigestEditionSummary,
  type DigestTopicDetail,
} from '@/lib/digest-api';
import { formatDate } from '@/lib/date';

interface TopicPreviewDetailProps {
  slug: string | null;
  followedTopicIds: ReadonlySet<string>;
  pendingFollowTopicIds?: ReadonlySet<string>;
  onFollowTopic: (topic: { id: string; slug: string }) => void;
}

type TopicPreviewData = {
  topic: DigestTopicDetail;
  editions: DigestEditionSummary[];
};

export function TopicPreviewDetail({
  slug,
  followedTopicIds,
  pendingFollowTopicIds,
  onFollowTopic,
}: TopicPreviewDetailProps) {
  const env = usePublicEnv();

  const requiredSlug = slug ?? '';
  const queryKey = useMemo(
    () => ['topicPreview', env.apiUrl, requiredSlug] as const,
    [env.apiUrl, requiredSlug]
  );

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey,
    enabled: Boolean(slug),
    queryFn: async (): Promise<TopicPreviewData> => {
      const [topic, editions] = await Promise.all([
        getTopicBySlug(env.apiUrl, requiredSlug),
        getTopicEditions(env.apiUrl, requiredSlug, { page: 1, limit: 12 }),
      ]);
      return { topic, editions: editions.items };
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (previous) => previous,
  });

  if (!slug) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a topic to preview</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-8 h-24 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">Failed to load topic preview</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? 'Retrying…' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  const isFollowing =
    followedTopicIds.has(data.topic.id) || pendingFollowTopicIds?.has(data.topic.id) === true;
  const isFollowPending = pendingFollowTopicIds?.has(data.topic.id) === true;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h1 className="truncate text-sm font-semibold">{data.topic.title}</h1>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={isFollowing ? 'secondary' : 'default'}
            size="sm"
            className="h-8"
            onClick={() => onFollowTopic({ id: data.topic.id, slug: data.topic.slug })}
            disabled={isFollowPending}
          >
            {isFollowPending ? 'Following…' : isFollowing ? 'Following' : 'Follow'}
          </Button>
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <a href={`/topics/${data.topic.slug}`} target="_blank" rel="noopener noreferrer">
              <Icon icon={SquareArrowUpRightIcon} className="size-4" />
            </a>
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          {data.topic.description && (
            <p className="text-sm text-muted-foreground">{data.topic.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon icon={UserMultiple02Icon} className="size-4" />
              {data.topic.subscriberCount.toLocaleString()} subscribers
            </span>
            {data.topic.lastEditionAt && (
              <span className="inline-flex items-center gap-1">
                <Icon icon={Calendar01Icon} className="size-4" />
                Updated {formatDate(data.topic.lastEditionAt)}
              </span>
            )}
          </div>

          {data.topic.interests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.topic.interests.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="mb-3 text-xs font-medium uppercase text-muted-foreground">
                Recent Editions
              </div>
              {data.editions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No editions yet</div>
              ) : (
                <div className="space-y-2">
                  {data.editions.map((edition) => (
                    <a
                      key={edition.id}
                      href={`/topics/${data.topic.slug}/editions/${edition.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent"
                    >
                      <span className="truncate">
                        {formatDate(edition.scheduledAt)} · {edition.itemCount} items
                      </span>
                      <Icon
                        icon={SquareArrowUpRightIcon}
                        className="size-4 text-muted-foreground"
                      />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
