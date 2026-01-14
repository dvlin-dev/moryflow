/**
 * [PROPS]: subscriptions array, loading state
 * [POS]: Displays list of user's subscriptions with actions
 */

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Calendar01Icon,
  MoreVerticalIcon,
  PlayIcon,
  PauseIcon,
  Delete01Icon,
  Edit01Icon,
  Share01Icon,
} from '@hugeicons/core-free-icons';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Icon,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from '@aiget/ui';
import { useToggleSubscription, useDeleteSubscription, useTriggerManualRun } from '../hooks';
import { PublishTopicDialog } from './publish-topic-dialog';
import type { Subscription } from '../types';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  isLoading?: boolean;
  onEdit?: (subscription: Subscription) => void;
}

export function SubscriptionList({ subscriptions, isLoading, onEdit }: SubscriptionListProps) {
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  const toggleMutation = useToggleSubscription();
  const deleteMutation = useDeleteSubscription();
  const triggerMutation = useTriggerManualRun();

  const handlePublishClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setPublishDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No subscriptions yet. Create your first subscription to start receiving digests.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {subscriptions.map((subscription) => (
        <Card key={subscription.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Link
                  to="/subscriptions/$id"
                  params={{ id: subscription.id }}
                  className="hover:underline"
                >
                  <CardTitle className="text-base">{subscription.name}</CardTitle>
                </Link>
                <p className="text-sm text-muted-foreground">{subscription.topic}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={subscription.enabled ? 'default' : 'secondary'}>
                  {subscription.enabled ? 'Active' : 'Paused'}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Icon icon={MoreVerticalIcon} className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(subscription)}>
                      <Icon icon={Edit01Icon} className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toggleMutation.mutate(subscription.id)}
                      disabled={toggleMutation.isPending}
                    >
                      <Icon
                        icon={subscription.enabled ? PauseIcon : PlayIcon}
                        className="mr-2 h-4 w-4"
                      />
                      {subscription.enabled ? 'Pause' : 'Enable'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => triggerMutation.mutate(subscription.id)}
                      disabled={triggerMutation.isPending}
                    >
                      <Icon icon={PlayIcon} className="mr-2 h-4 w-4" />
                      Run now
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handlePublishClick(subscription)}>
                      <Icon icon={Share01Icon} className="mr-2 h-4 w-4" />
                      Publish as topic
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(subscription.id)}
                      disabled={deleteMutation.isPending}
                      className="text-destructive"
                    >
                      <Icon icon={Delete01Icon} className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Icon icon={Calendar01Icon} className="h-4 w-4" />
                {subscription.cron} ({subscription.timezone})
              </span>
              {subscription.lastRunAt && (
                <span>
                  Last run:{' '}
                  {new Date(subscription.lastRunAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              {subscription.nextRunAt && (
                <span>
                  Next run:{' '}
                  {new Date(subscription.nextRunAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            {subscription.interests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {subscription.interests.slice(0, 5).map((interest) => (
                  <Badge key={interest} variant="outline" className="text-xs">
                    {interest}
                  </Badge>
                ))}
                {subscription.interests.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{subscription.interests.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <PublishTopicDialog
        subscription={selectedSubscription}
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
      />
    </div>
  );
}
