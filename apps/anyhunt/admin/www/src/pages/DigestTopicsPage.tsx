/**
 * Digest Topics Page
 *
 * [PROPS]: None
 * [POS]: Admin topic management with featured configuration (Lucide icons direct render)
 */

import { useState } from 'react';
import { Search, Star, ArrowUp, ChevronDown, View } from 'lucide-react';
import { PageHeader, SimplePagination } from '@anyhunt/ui';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Skeleton,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@anyhunt/ui';
import { formatRelativeTime } from '@anyhunt/ui/lib';
import {
  useTopics,
  useFeaturedTopics,
  useSetFeatured,
  useReorderFeatured,
  type Topic,
  type TopicQuery,
  type TopicVisibility,
  type TopicStatus,
} from '@/features/digest-topics';

const VISIBILITY_OPTIONS: TopicVisibility[] = ['PUBLIC', 'PRIVATE', 'UNLISTED'];
const STATUS_OPTIONS: TopicStatus[] = ['ACTIVE', 'PAUSED_INSUFFICIENT_CREDITS', 'PAUSED_BY_ADMIN'];

// www 站点 URL（用于查看 Topic）
const WWW_URL = 'https://anyhunt.app';

const visibilityConfig: Record<
  TopicVisibility,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  PUBLIC: { label: 'Public', variant: 'default' },
  PRIVATE: { label: 'Private', variant: 'secondary' },
  UNLISTED: { label: 'Unlisted', variant: 'outline' },
};

const statusConfig: Record<
  TopicStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  ACTIVE: { label: 'Active', variant: 'default' },
  PAUSED_INSUFFICIENT_CREDITS: { label: 'No Credits', variant: 'destructive' },
  PAUSED_BY_ADMIN: { label: 'Paused', variant: 'secondary' },
};

export default function DigestTopicsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'featured'>('all');
  const [query, setQuery] = useState<TopicQuery>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');

  const { data: topicsData, isLoading: isLoadingTopics } = useTopics(query);
  const { data: featuredTopics, isLoading: isLoadingFeatured } = useFeaturedTopics();
  const setFeaturedMutation = useSetFeatured();
  const reorderMutation = useReorderFeatured();

  const handleSearch = () => {
    setQuery((prev) => ({ ...prev, page: 1, search: searchInput || undefined }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const handleFilterVisibility = (visibility: string) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      visibility: visibility === 'all' ? undefined : (visibility as TopicVisibility),
    }));
  };

  const handleFilterStatus = (status: string) => {
    setQuery((prev) => ({
      ...prev,
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
    if (!featuredTopics || index === 0) return;
    const newOrder = [...featuredTopics];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderMutation.mutate({ topicIds: newOrder.map((t) => t.id) });
  };

  const handleMoveDown = (index: number) => {
    if (!featuredTopics || index === featuredTopics.length - 1) return;
    const newOrder = [...featuredTopics];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderMutation.mutate({ topicIds: newOrder.map((t) => t.id) });
  };

  const featuredCount = featuredTopics?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digest Topics"
        description={`Manage topic visibility and featured configuration (${featuredCount} featured)`}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'featured')}>
        <TabsList>
          <TabsTrigger value="all">All Topics</TabsTrigger>
          <TabsTrigger value="featured">Featured ({featuredCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <AllTopicsTab
            data={topicsData}
            isLoading={isLoadingTopics}
            query={query}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            onSearch={handleSearch}
            onKeyDown={handleKeyDown}
            onPageChange={handlePageChange}
            onFilterVisibility={handleFilterVisibility}
            onFilterStatus={handleFilterStatus}
            onToggleFeatured={handleToggleFeatured}
            isToggling={setFeaturedMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="featured" className="mt-4">
          <FeaturedTopicsTab
            topics={featuredTopics}
            isLoading={isLoadingFeatured}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onRemoveFeatured={(topic) => handleToggleFeatured(topic)}
            isReordering={reorderMutation.isPending}
            isRemoving={setFeaturedMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// All Topics Tab Component
interface AllTopicsTabProps {
  data:
    | { items: Topic[]; total: number; page: number; limit: number; totalPages: number }
    | undefined;
  isLoading: boolean;
  query: TopicQuery;
  searchInput: string;
  setSearchInput: (v: string) => void;
  onSearch: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPageChange: (page: number) => void;
  onFilterVisibility: (visibility: string) => void;
  onFilterStatus: (status: string) => void;
  onToggleFeatured: (topic: Topic) => void;
  isToggling: boolean;
}

function AllTopicsTab({
  data,
  isLoading,
  query,
  searchInput,
  setSearchInput,
  onSearch,
  onKeyDown,
  onPageChange,
  onFilterVisibility,
  onFilterStatus,
  onToggleFeatured,
  isToggling,
}: AllTopicsTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Topic List</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={query.visibility || 'all'} onValueChange={onFilterVisibility}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visibility</SelectItem>
                {VISIBILITY_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {visibilityConfig[v].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={query.status || 'all'} onValueChange={onFilterStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusConfig[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={onKeyDown}
              className="w-40"
            />
            <Button variant="outline" size="icon" onClick={onSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : !data?.items.length ? (
          <EmptyState message="No topics found" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((topic) => (
                  <TableRow key={topic.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{topic.title}</p>
                        <p className="text-sm text-muted-foreground">/{topic.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{topic.createdBy?.name || 'Unknown'}</p>
                        <p className="text-muted-foreground">{topic.createdBy?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={visibilityConfig[topic.visibility].variant}>
                        {visibilityConfig[topic.visibility].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[topic.status].variant}>
                        {statusConfig[topic.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{topic.subscriberCount}</span>
                    </TableCell>
                    <TableCell>
                      {topic.featured ? (
                        <Badge variant="default" className="gap-1">
                          <Star className="h-3 w-3" />#{(topic.featuredOrder ?? 0) + 1}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`${WWW_URL}/topics/${topic.slug}`, '_blank')}
                          title="View Topic"
                        >
                          <View className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={topic.featured ? 'default' : 'outline'}
                          size="icon"
                          onClick={() => onToggleFeatured(topic)}
                          disabled={isToggling}
                          title={topic.featured ? 'Remove from Featured' : 'Add to Featured'}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <SimplePagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={onPageChange}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Featured Topics Tab Component
interface FeaturedTopicsTabProps {
  topics: Topic[] | undefined;
  isLoading: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemoveFeatured: (topic: Topic) => void;
  isReordering: boolean;
  isRemoving: boolean;
}

function FeaturedTopicsTab({
  topics,
  isLoading,
  onMoveUp,
  onMoveDown,
  onRemoveFeatured,
  isReordering,
  isRemoving,
}: FeaturedTopicsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Featured Topics Order</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : !topics?.length ? (
          <EmptyState message="No featured topics. Add topics from the All Topics tab." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Order</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead>Featured At</TableHead>
                <TableHead>Featured By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic, index) => (
                <TableRow key={topic.id}>
                  <TableCell>
                    <Badge variant="outline">#{index + 1}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{topic.title}</p>
                      <p className="text-sm text-muted-foreground">/{topic.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{topic.subscriberCount}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {topic.featuredAt ? formatRelativeTime(topic.featuredAt) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {topic.featuredBy?.name || topic.featuredBy?.email || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onMoveUp(index)}
                        disabled={index === 0 || isReordering}
                        title="Move Up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onMoveDown(index)}
                        disabled={index === topics.length - 1 || isReordering}
                        title="Move Down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(`${WWW_URL}/topics/${topic.slug}`, '_blank')}
                        title="View Topic"
                      >
                        <View className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => onRemoveFeatured(topic)}
                        disabled={isRemoving}
                        title="Remove from Featured"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Shared Components
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
