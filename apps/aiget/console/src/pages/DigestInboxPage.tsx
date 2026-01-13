/**
 * Digest Inbox Page
 *
 * [INPUT]: User's inbox items
 * [OUTPUT]: Inbox with filtering and actions
 * [POS]: /digest/inbox route
 */

import { useState } from 'react';
import { MailCheck, FilterIcon } from '@hugeicons/core-free-icons';
import {
  Button,
  Icon,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@aiget/ui';
import {
  useInboxItems,
  useInboxStats,
  useMarkAllAsRead,
  InboxItemCard,
  type InboxItemState,
} from '@/features/digest';

const stateFilters: { label: string; value: InboxItemState | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Unread', value: 'UNREAD' },
  { label: 'Saved', value: 'SAVED' },
  { label: 'Read', value: 'READ' },
];

export default function DigestInboxPage() {
  const [stateFilter, setStateFilter] = useState<InboxItemState | 'ALL'>('ALL');
  const { data: stats, isLoading: statsLoading } = useInboxStats();
  const { data: items, isLoading: itemsLoading } = useInboxItems({
    state: stateFilter === 'ALL' ? undefined : stateFilter,
    limit: 50,
  });
  const markAllAsRead = useMarkAllAsRead();

  return (
    <div className="container max-w-4xl py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inbox</h1>
          <p className="text-muted-foreground">Your curated content from all subscriptions</p>
        </div>
        <Button
          variant="outline"
          onClick={() => markAllAsRead.mutate(undefined)}
          disabled={markAllAsRead.isPending || stats?.unread === 0}
        >
          <Icon icon={MailCheck} className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {statsLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-8 w-16" />
                <Skeleton className="h-4 w-12" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card className={stats?.unread ? 'border-primary' : ''}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats?.unread ?? 0}</div>
                <div className="text-xs text-muted-foreground">Unread</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats?.saved ?? 0}</div>
                <div className="text-xs text-muted-foreground">Saved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats?.read ?? 0}</div>
                <div className="text-xs text-muted-foreground">Read</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <Icon icon={FilterIcon} className="h-4 w-4 text-muted-foreground" />
        <Select
          value={stateFilter}
          onValueChange={(value) => setStateFilter(value as InboxItemState | 'ALL')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by state" />
          </SelectTrigger>
          <SelectContent>
            {stateFilters.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Items List */}
      {itemsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-8 w-8 shrink-0 rounded" />
                  <div className="flex-1">
                    <Skeleton className="mb-2 h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items?.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {stateFilter === 'ALL'
                ? 'Your inbox is empty. Content will appear here after your subscriptions run.'
                : `No ${stateFilter.toLowerCase()} items.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items?.items.map((item) => (
            <InboxItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
