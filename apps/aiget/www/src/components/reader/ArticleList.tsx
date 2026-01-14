/**
 * [PROPS]: items, selectedId, onSelect, subscriptionName, filter, onFilterChange, onRefresh, onMarkAllRead
 * [POS]: Middle column article list with header actions
 */

import {
  ScrollArea,
  Button,
  Skeleton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Icon,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@aiget/ui';
import { RefreshIcon, FilterIcon, CheckmarkSquare01Icon } from '@hugeicons/core-free-icons';
import { ArticleCard } from './ArticleCard';
import type { InboxItem } from '@/features/digest/types';

export type FilterState = 'all' | 'unread' | 'saved' | 'not_interested';

interface ArticleListProps {
  /** Article items to display */
  items: InboxItem[];
  /** Currently selected article ID */
  selectedId: string | null;
  /** Callback when selecting an article */
  onSelect: (item: InboxItem) => void;
  /** Title to show in header */
  title: string;
  /** Current filter state */
  filter: FilterState;
  /** Callback when filter changes */
  onFilterChange: (filter: FilterState) => void;
  /** Callback to refresh the list */
  onRefresh: () => void;
  /** Callback to mark all as read */
  onMarkAllRead: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Refreshing state */
  isRefreshing?: boolean;
}

const filterLabels: Record<FilterState, string> = {
  all: 'All',
  unread: 'Unread',
  saved: 'Saved',
  not_interested: 'Not Interested',
};

export function ArticleList({
  items,
  selectedId,
  onSelect,
  title,
  filter,
  onFilterChange,
  onRefresh,
  onMarkAllRead,
  isLoading,
  isRefreshing,
}: ArticleListProps) {
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
          <p className="text-sm text-muted-foreground">No articles found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filter !== 'all' ? 'Try changing the filter' : 'Check back later for new content'}
          </p>
        </div>
      );
    }

    return items.map((item) => (
      <ArticleCard
        key={item.id}
        item={item}
        isSelected={selectedId === item.id}
        onClick={() => onSelect(item)}
      />
    ));
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            {/* Refresh button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                >
                  <Icon
                    icon={RefreshIcon}
                    className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>

            {/* Filter dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <Icon icon={FilterIcon} className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Filter</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={filter}
                  onValueChange={(v: string) => onFilterChange(v as FilterState)}
                >
                  {Object.entries(filterLabels).map(([value, label]) => (
                    <DropdownMenuRadioItem key={value} value={value}>
                      {label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mark all read button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={onMarkAllRead}>
                  <Icon icon={CheckmarkSquare01Icon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mark All Read</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Article list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">{renderContent()}</div>
      </ScrollArea>
    </div>
  );
}
