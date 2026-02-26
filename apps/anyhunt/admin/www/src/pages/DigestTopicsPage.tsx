/**
 * Digest Topics Page
 *
 * [PROPS]: none
 * [POS]: Admin topic management container
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { type KeyboardEvent, useState } from 'react';
import { PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from '@moryflow/ui';
import {
  DIGEST_TOPIC_PUBLIC_BASE_URL,
  AllTopicsListContent,
  FeaturedTopicsListContent,
  resolveAllTopicsListState,
  resolveFeaturedTopicsListState,
  useFeaturedTopics,
  useReorderFeatured,
  useSetFeatured,
  useTopics,
  type Topic,
  type TopicQuery,
  type TopicStatus,
  type TopicVisibility,
} from '@/features/digest-topics';

type DigestTopicsTab = 'all' | 'featured';

export default function DigestTopicsPage() {
  const [activeTab, setActiveTab] = useState<DigestTopicsTab>('all');
  const [query, setQuery] = useState<TopicQuery>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');

  const topicsQuery = useTopics(query);
  const featuredTopicsQuery = useFeaturedTopics();
  const setFeaturedMutation = useSetFeatured();
  const reorderMutation = useReorderFeatured();

  const handleSearch = () => {
    setQuery((previous) => ({
      ...previous,
      page: 1,
      search: searchInput || undefined,
    }));
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (page: number) => {
    setQuery((previous) => ({ ...previous, page }));
  };

  const handleFilterVisibility = (visibility: string) => {
    setQuery((previous) => ({
      ...previous,
      page: 1,
      visibility: visibility === 'all' ? undefined : (visibility as TopicVisibility),
    }));
  };

  const handleFilterStatus = (status: string) => {
    setQuery((previous) => ({
      ...previous,
      page: 1,
      status: status === 'all' ? undefined : (status as TopicStatus),
    }));
  };

  const handleToggleFeatured = (topic: Topic) => {
    setFeaturedMutation.mutate({
      id: topic.id,
      input: { featured: !topic.featured },
    });
  };

  const handleMoveUp = (index: number) => {
    const topics = featuredTopicsQuery.data;
    if (!topics || index === 0) {
      return;
    }

    const newOrder = [...topics];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderMutation.mutate({ topicIds: newOrder.map((topic) => topic.id) });
  };

  const handleMoveDown = (index: number) => {
    const topics = featuredTopicsQuery.data;
    if (!topics || index === topics.length - 1) {
      return;
    }

    const newOrder = [...topics];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderMutation.mutate({ topicIds: newOrder.map((topic) => topic.id) });
  };

  const handleViewTopic = (slug: string) => {
    window.open(`${DIGEST_TOPIC_PUBLIC_BASE_URL}/topics/${slug}`, '_blank');
  };

  const allTopicsState = resolveAllTopicsListState({
    isLoading: topicsQuery.isLoading,
    hasError: topicsQuery.isError,
    itemCount: topicsQuery.data?.items.length ?? 0,
  });
  const featuredTopicsState = resolveFeaturedTopicsListState({
    isLoading: featuredTopicsQuery.isLoading,
    hasError: featuredTopicsQuery.isError,
    itemCount: featuredTopicsQuery.data?.length ?? 0,
  });

  const featuredCount = featuredTopicsQuery.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digest Topics"
        description={`Manage topic visibility and featured configuration (${featuredCount} featured)`}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DigestTopicsTab)}>
        <TabsList>
          <TabsTrigger value="all">All Topics</TabsTrigger>
          <TabsTrigger value="featured">Featured ({featuredCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <AllTopicsListContent
            viewModel={{
              state: allTopicsState,
              data: topicsQuery.data,
              error: topicsQuery.error,
              query,
              searchInput,
              isToggling: setFeaturedMutation.isPending,
            }}
            actions={{
              onSearchInputChange: setSearchInput,
              onSearch: handleSearch,
              onSearchKeyDown: handleSearchKeyDown,
              onPageChange: handlePageChange,
              onFilterVisibility: handleFilterVisibility,
              onFilterStatus: handleFilterStatus,
              onToggleFeatured: handleToggleFeatured,
              onViewTopic: handleViewTopic,
            }}
          />
        </TabsContent>

        <TabsContent value="featured" className="mt-4">
          <FeaturedTopicsListContent
            viewModel={{
              state: featuredTopicsState,
              topics: featuredTopicsQuery.data,
              error: featuredTopicsQuery.error,
              isReordering: reorderMutation.isPending,
              isRemoving: setFeaturedMutation.isPending,
            }}
            actions={{
              onMoveUp: handleMoveUp,
              onMoveDown: handleMoveDown,
              onRemoveFeatured: handleToggleFeatured,
              onViewTopic: handleViewTopic,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
