/**
 * [POS]: User inbox page - all delivered digest items
 */
import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { Mail01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import {
  Card,
  CardContent,
  Icon,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Badge,
} from '@aiget/ui';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  useInboxItems,
  useInboxStats,
  useMarkAllAsRead,
  useSubscriptions,
  InboxItemCard,
  type InboxItemState,
} from '@/features/digest';

const inboxSearchSchema = z.object({
  state: z.enum(['UNREAD', 'READ', 'SAVED', 'NOT_INTERESTED']).optional(),
  subscriptionId: z.string().optional(),
});

export const Route = createFileRoute('/inbox')({
  validateSearch: inboxSearchSchema,
  component: InboxPage,
  head: () => ({
    meta: [{ title: 'Inbox - Aiget Dev' }, { name: 'description', content: 'Your digest inbox' }],
  }),
});

function InboxPage() {
  const { state: searchState, subscriptionId: searchSubscriptionId } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [stateFilter, setStateFilter] = useState<InboxItemState | 'all'>(searchState || 'all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>(
    searchSubscriptionId || 'all'
  );

  const { data: stats } = useInboxStats();
  const { data: subscriptions } = useSubscriptions();
  const { data: inboxData, isLoading } = useInboxItems({
    state: stateFilter === 'all' ? undefined : stateFilter,
    subscriptionId: subscriptionFilter === 'all' ? undefined : subscriptionFilter,
  });
  const markAllAsRead = useMarkAllAsRead();

  const handleStateChange = (value: string) => {
    const newState = value === 'all' ? undefined : (value as InboxItemState);
    setStateFilter(value as InboxItemState | 'all');
    navigate({ search: { state: newState, subscriptionId: searchSubscriptionId } });
  };

  const handleSubscriptionChange = (value: string) => {
    const newSubscriptionId = value === 'all' ? undefined : value;
    setSubscriptionFilter(value);
    navigate({ search: { state: searchState, subscriptionId: newSubscriptionId } });
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate(subscriptionFilter === 'all' ? undefined : subscriptionFilter);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-muted-foreground">
              {stats?.unread ?? 0} unread of {stats?.total ?? 0} items
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending || (stats?.unread ?? 0) === 0}
          >
            <Icon icon={Tick02Icon} className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={stateFilter} onValueChange={handleStateChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              <SelectItem value="UNREAD">Unread</SelectItem>
              <SelectItem value="READ">Read</SelectItem>
              <SelectItem value="SAVED">Saved</SelectItem>
              <SelectItem value="NOT_INTERESTED">Not interested</SelectItem>
            </SelectContent>
          </Select>

          <Select value={subscriptionFilter} onValueChange={handleSubscriptionChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by subscription" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subscriptions</SelectItem>
              {subscriptions?.items.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stats badges */}
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="outline">{stats?.unread ?? 0} unread</Badge>
            <Badge variant="outline">{stats?.saved ?? 0} saved</Badge>
          </div>
        </div>

        {/* Items */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : inboxData?.items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Icon icon={Mail01Icon} className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No items found</h3>
              <p className="mt-2 text-muted-foreground">
                {stateFilter === 'all'
                  ? 'Your inbox is empty. Create a subscription to start receiving digests.'
                  : `No ${stateFilter.toLowerCase().replace('_', ' ')} items.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {inboxData?.items.map((item) => (
              <InboxItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
