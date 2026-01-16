/**
 * [PROPS]: enabled, selectedSlug, followedTopicIds, onSelectTopic, onFollowTopic, onCreateSubscription
 * [POS]: Reader 中栏 - Topic 浏览（替代原 /discover 独立页）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Icon, Input, ScrollArea, Skeleton } from '@anyhunt/ui';
import {
  Search01Icon,
  Add01Icon,
  FireIcon,
  AiCloud01Icon,
  CodeIcon,
  Dollar01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@anyhunt/ui/lib';
import { usePublicEnv } from '@/lib/public-env-context';
import { getPublicTopics, type DigestTopicSummary } from '@/lib/digest-api';

const CATEGORIES = [
  { id: 'trending', label: 'Trending', icon: FireIcon, search: undefined as string | undefined },
  {
    id: 'ai',
    label: 'AI',
    icon: AiCloud01Icon,
    search: 'AI artificial intelligence machine learning',
  },
  { id: 'tech', label: 'Tech', icon: CodeIcon, search: 'technology software startup' },
  {
    id: 'finance',
    label: 'Finance',
    icon: Dollar01Icon,
    search: 'finance investment stock market',
  },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

interface TopicBrowseListProps {
  enabled: boolean;
  selectedSlug: string | null;
  followedTopicIds: ReadonlySet<string>;
  pendingFollowTopicIds?: ReadonlySet<string>;
  onSelectTopic: (topic: DigestTopicSummary) => void;
  onFollowTopic: (topic: DigestTopicSummary) => void;
  onCreateSubscription: (initialQuery?: string) => void;
}

export function TopicBrowseList({
  enabled,
  selectedSlug,
  followedTopicIds,
  pendingFollowTopicIds,
  onSelectTopic,
  onFollowTopic,
  onCreateSubscription,
}: TopicBrowseListProps) {
  const env = usePublicEnv();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('trending');

  const currentSearch = activeSearch || CATEGORIES.find((c) => c.id === selectedCategory)?.search;

  const queryKey = useMemo(
    () => ['readerTopicBrowse', selectedCategory, activeSearch, env.apiUrl] as const,
    [selectedCategory, activeSearch, env.apiUrl]
  );

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey,
    enabled,
    queryFn: () =>
      getPublicTopics(env.apiUrl, {
        sort: selectedCategory === 'trending' && !activeSearch ? 'trending' : undefined,
        search: currentSearch,
        limit: 30,
      }),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (previous) => previous,
  });

  const topics = data?.items ?? [];

  useEffect(() => {
    if (!enabled) return;
    if (topics.length === 0) return;
    if (selectedSlug && topics.some((t) => t.slug === selectedSlug)) return;
    onSelectTopic(topics[0]);
  }, [enabled, selectedSlug, topics, onSelectTopic]);

  const handleSearch = () => {
    setActiveSearch(searchQuery.trim());
  };

  const handleCategoryChange = (categoryId: CategoryId) => {
    setSelectedCategory(categoryId);
    setActiveSearch('');
    setSearchQuery('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="text-sm font-semibold">Discover</div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          onClick={() => refetch()}
          disabled={!enabled || isRefetching}
        >
          {isRefetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="space-y-3 border-b border-border p-4">
        <div className="relative">
          <Icon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder="Search topics…"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange(category.id)}
            >
              <Icon icon={category.icon} className="mr-1 size-4" />
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-md border border-border p-3">
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Failed to load topics</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                {isRefetching ? 'Retrying…' : 'Retry'}
              </Button>
            </div>
          ) : topics.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No topics found</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => onCreateSubscription(activeSearch || searchQuery)}
              >
                <Icon icon={Add01Icon} className="mr-1 size-4" />
                Create subscription
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {topics.map((topic) => {
                const isSelected = selectedSlug === topic.slug;
                const isFollowing =
                  followedTopicIds.has(topic.id) || pendingFollowTopicIds?.has(topic.id) === true;
                const isFollowPending = pendingFollowTopicIds?.has(topic.id) === true;

                return (
                  <div
                    key={topic.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectTopic(topic)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectTopic(topic);
                      }
                    }}
                    className={cn(
                      'group flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      isSelected
                        ? 'bg-accent text-foreground'
                        : 'text-foreground hover:bg-accent/60'
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{topic.title}</div>
                      {topic.description && (
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {topic.description}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {topic.subscriberCount.toLocaleString()} subscribers
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={isFollowing ? 'secondary' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-8 shrink-0 px-2 text-xs',
                        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                      )}
                      disabled={isFollowPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFollowTopic(topic);
                      }}
                    >
                      {isFollowPending ? 'Following…' : isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  </div>
                );
              })}

              <div className="mt-3 rounded-md border border-dashed border-border p-3">
                <div className="text-sm font-medium">Create a custom subscription</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Use your own keywords and let AI curate the best items.
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  onClick={() => onCreateSubscription(activeSearch || searchQuery)}
                >
                  <Icon icon={Add01Icon} className="mr-1 size-4" />
                  New subscription
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
