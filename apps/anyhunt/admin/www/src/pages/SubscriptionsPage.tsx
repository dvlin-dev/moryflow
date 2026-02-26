/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Subscriptions 页面 - 订阅管理（Lucide icons direct render）
 */
import { useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '@moryflow/ui';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui';
import { useSubscriptions, useUpdateSubscription } from '@/features/subscriptions';
import type {
  SubscriptionListItem,
  SubscriptionQuery,
  SubscriptionStatus,
  SubscriptionTier,
} from '@/features/subscriptions';
import {
  SUBSCRIPTION_STATUS_OPTIONS,
  SUBSCRIPTION_TIER_OPTIONS,
  SubscriptionEditDialog,
  SubscriptionsListContent,
  type SubscriptionsContentState,
  type SubscriptionEditFormValues,
} from '@/features/subscriptions';
import { usePagedSearchQuery } from '@/lib/usePagedSearchQuery';

function resolveSubscriptionsContentState(params: {
  isLoading: boolean;
  itemCount: number;
}): SubscriptionsContentState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.itemCount > 0) {
    return 'ready';
  }

  return 'empty';
}

export default function SubscriptionsPage() {
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionListItem | null>(
    null
  );
  const editDialogOpen = selectedSubscription !== null;

  const {
    query,
    searchInput,
    setSearchInput,
    handleSearch,
    handleSearchKeyDown,
    handlePageChange,
    setQueryFilter,
  } = usePagedSearchQuery<SubscriptionQuery>({
    initialQuery: { page: 1, limit: 20 },
  });

  const { data, isLoading } = useSubscriptions(query);
  const { mutate: updateSubscription, isPending: isUpdating } = useUpdateSubscription();

  const handleFilterTier = (tier: string) => {
    setQueryFilter('tier', tier === 'all' ? undefined : (tier as SubscriptionTier));
  };

  const handleFilterStatus = (status: string) => {
    setQueryFilter('status', status === 'all' ? undefined : (status as SubscriptionStatus));
  };

  const handleEdit = (subscription: SubscriptionListItem) => {
    setSelectedSubscription(subscription);
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedSubscription(null);
    }
  };

  const handleSave = (values: SubscriptionEditFormValues) => {
    if (!selectedSubscription) {
      return;
    }

    updateSubscription(
      {
        id: selectedSubscription.id,
        data: values,
      },
      {
        onSuccess: () => setSelectedSubscription(null),
      }
    );
  };

  const subscriptionsContentState = resolveSubscriptionsContentState({
    isLoading,
    itemCount: data?.items.length ?? 0,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="管理用户订阅" />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>订阅列表</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={query.tier || 'all'} onValueChange={handleFilterTier}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="层级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部层级</SelectItem>
                  {SUBSCRIPTION_TIER_OPTIONS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={query.status || 'all'} onValueChange={handleFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {SUBSCRIPTION_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="搜索用户..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-48"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SubscriptionsListContent
            state={subscriptionsContentState}
            data={data}
            onEdit={handleEdit}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      <SubscriptionEditDialog
        open={editDialogOpen}
        subscription={selectedSubscription}
        isPending={isUpdating}
        onOpenChange={handleEditDialogOpenChange}
        onSubmit={handleSave}
      />
    </div>
  );
}
