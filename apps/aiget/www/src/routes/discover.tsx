/**
 * Discover Page
 *
 * [INPUT]: None
 * [OUTPUT]: Topic discovery with search, categories, and follow functionality
 * [POS]: /discover - Browse and follow public topics
 */

import { useState, useMemo, useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ScrollArea, Input, Button, Skeleton, Icon } from '@aiget/ui';
import {
  Search01Icon,
  ArrowLeft02Icon,
  Add01Icon,
  FireIcon,
  AiCloud01Icon,
  CodeIcon,
  Dollar01Icon,
} from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/auth-context';
import { useFollowTopic, useSubscriptions } from '@/features/digest/hooks';
import { getPublicTopics, type DigestTopicSummary } from '@/lib/digest-api';
import { usePublicEnv } from './__root';
import { TopicCard } from '@/components/reader/TopicCard';
import { CreateSubscriptionDialog } from '@/components/reader/CreateSubscriptionDialog';

export const Route = createFileRoute('/discover')({
  component: DiscoverPage,
  head: () => ({
    meta: [
      { title: 'Discover Topics - Aiget' },
      {
        name: 'description',
        content:
          'Discover AI-curated topics to follow. Browse trending, featured, and latest topics.',
      },
    ],
  }),
});

const CATEGORIES = [
  { id: 'trending', label: 'Trending', icon: FireIcon, search: undefined },
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

function DiscoverPage() {
  const env = usePublicEnv();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('trending');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: subscriptionsData } = useSubscriptions();
  const followTopic = useFollowTopic();

  // Get search term from category or active search
  const currentSearch = activeSearch || CATEGORIES.find((c) => c.id === selectedCategory)?.search;

  // Fetch topics with React Query
  const {
    data: topicsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['publicTopics', selectedCategory, activeSearch],
    queryFn: () =>
      getPublicTopics(env.apiUrl, {
        sort: selectedCategory === 'trending' && !activeSearch ? 'trending' : undefined,
        search: currentSearch,
        limit: 20,
      }),
  });

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error('Failed to load topics');
    }
  }, [error]);

  const topics = topicsData?.items ?? [];

  // Memoize followed topic IDs
  const followedTopicIds = useMemo(
    () =>
      new Set(
        subscriptionsData?.items.filter((s) => s.followedTopicId).map((s) => s.followedTopicId) ||
          []
      ),
    [subscriptionsData]
  );

  // Handle search submission
  const handleSearch = () => {
    setActiveSearch(searchQuery.trim());
  };

  // Handle follow topic
  const handleFollow = (topic: DigestTopicSummary) => {
    if (!isAuthenticated) {
      navigate({ to: '/login' });
      return;
    }

    followTopic.mutate({
      slug: topic.slug,
      data: {},
    });
  };

  // Clear search when category changes
  const handleCategoryChange = (categoryId: CategoryId) => {
    setSelectedCategory(categoryId);
    setActiveSearch('');
    setSearchQuery('');
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Icon icon={ArrowLeft02Icon} className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">Discover</h1>
      </header>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-4xl p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Icon
                icon={Search01Icon}
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="text"
                placeholder="Search topics or enter keywords to create subscription..."
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
          </div>

          {/* Categories */}
          <div className="mb-6 flex flex-wrap gap-2">
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

          {/* Topics grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-lg border p-4">
                  <Skeleton className="mb-2 h-5 w-3/4" />
                  <Skeleton className="mb-3 h-4 w-full" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : topics.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No topics found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different search or create your own subscription
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onFollow={handleFollow}
                  isFollowing={followedTopicIds.has(topic.id)}
                />
              ))}
            </div>
          )}

          {/* Create custom subscription CTA */}
          <div className="mt-8 rounded-lg border border-dashed p-6 text-center">
            <p className="mb-2 text-muted-foreground">Can't find what you're looking for?</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Create a custom subscription with your own keywords
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Icon icon={Add01Icon} className="mr-2 size-4" />
              Create Custom Subscription
            </Button>
          </div>
        </div>
      </ScrollArea>

      <CreateSubscriptionDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
