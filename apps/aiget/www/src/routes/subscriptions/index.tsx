/**
 * [POS]: User subscriptions page - manage digest subscriptions
 */
import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { Button, Icon } from '@aiget/ui';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useSubscriptions, SubscriptionList, CreateSubscriptionDialog } from '@/features/digest';

export const Route = createFileRoute('/subscriptions/')({
  component: SubscriptionsPage,
  head: () => ({
    meta: [
      { title: 'Subscriptions - Aiget Dev' },
      { name: 'description', content: 'Manage your digest subscriptions' },
    ],
  }),
});

function SubscriptionsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data, isLoading } = useSubscriptions();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Subscriptions</h1>
            <p className="text-muted-foreground">Manage your digest subscriptions</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Icon icon={Add01Icon} className="mr-2 h-4 w-4" />
            New Subscription
          </Button>
        </div>

        <SubscriptionList subscriptions={data?.items ?? []} isLoading={isLoading} />

        <CreateSubscriptionDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    </DashboardLayout>
  );
}
