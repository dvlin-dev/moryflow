/**
 * [PROPS]: items, selectedId, onSelect, feedType, onFeedTypeChange, isLoading
 * [POS]: Discover feed list for featured/trending content
 */

import { ScrollArea, Button, Skeleton, Icon } from '@aiget/ui';
import { RefreshIcon, SparklesIcon, Fire02Icon } from '@hugeicons/core-free-icons';
import { DiscoverFeedCard } from './DiscoverFeedCard';
import type { DiscoverFeedItem, DiscoverFeedType } from '@/features/discover/types';

interface DiscoverFeedListProps {
  /** Feed items to display */
  items: DiscoverFeedItem[];
  /** Currently selected item ID */
  selectedId: string | null;
  /** Callback when selecting an item */
  onSelect: (item: DiscoverFeedItem) => void;
  /** Current feed type */
  feedType: DiscoverFeedType;
  /** Callback when feed type changes */
  onFeedTypeChange: (type: DiscoverFeedType) => void;
  /** Callback to refresh */
  onRefresh: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Refreshing state */
  isRefreshing?: boolean;
}

const feedTypeConfig: Record<DiscoverFeedType, { icon: typeof SparklesIcon; label: string }> = {
  featured: { icon: SparklesIcon, label: 'Featured' },
  trending: { icon: Fire02Icon, label: 'Trending' },
};

export function DiscoverFeedList({
  items,
  selectedId,
  onSelect,
  feedType,
  onFeedTypeChange,
  onRefresh,
  isLoading,
  isRefreshing,
}: DiscoverFeedListProps) {
  function renderContent() {
    if (isLoading) {
      return (
        <>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-md border border-border p-3">
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="mb-2 h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">No content found</p>
          <p className="mt-1 text-xs text-muted-foreground">Check back later for new content</p>
        </div>
      );
    }

    return items.map((item) => (
      <DiscoverFeedCard
        key={item.id}
        item={item}
        isSelected={selectedId === item.id}
        onClick={() => onSelect(item)}
      />
    ));
  }

  const currentConfig = feedTypeConfig[feedType];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Icon icon={currentConfig.icon} className="size-4" />
          <h2 className="text-sm font-semibold">{currentConfig.label}</h2>
        </div>
        <div className="flex items-center gap-1">
          {/* Feed type toggle */}
          {Object.entries(feedTypeConfig).map(([type, config]) => (
            <Button
              key={type}
              variant={feedType === type ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => onFeedTypeChange(type as DiscoverFeedType)}
            >
              <Icon icon={config.icon} className="size-3.5" />
            </Button>
          ))}

          {/* Refresh button */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <Icon icon={RefreshIcon} className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Feed list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">{renderContent()}</div>
      </ScrollArea>
    </div>
  );
}
