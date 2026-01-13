/**
 * Digest Subscriptions Page
 *
 * [INPUT]: User's subscriptions
 * [OUTPUT]: List of subscriptions with management actions
 * [POS]: /digest/subscriptions route
 */

import { useState } from 'react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { Button, Icon } from '@aiget/ui';
import { useSubscriptions, SubscriptionList, CreateSubscriptionDialog } from '@/features/digest';

export default function DigestSubscriptionsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data, isLoading } = useSubscriptions();

  return (
    <div className="container max-w-4xl py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subscriptions</h1>
          <p className="text-muted-foreground">Manage your content digest subscriptions</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Icon icon={Add01Icon} className="mr-2 h-4 w-4" />
          New Subscription
        </Button>
      </div>

      <SubscriptionList subscriptions={data?.items ?? []} isLoading={isLoading} />

      <CreateSubscriptionDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
