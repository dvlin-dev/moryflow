/**
 * [POS]: Subscription detail page - view and manage single subscription
 */
import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft01Icon,
  PlayIcon,
  Delete01Icon,
  Calendar01Icon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Icon,
  Badge,
  Skeleton,
  Switch,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@aiget/ui';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  useSubscription,
  useRuns,
  useTriggerManualRun,
  useToggleSubscription,
  useDeleteSubscription,
} from '@/features/digest';

export const Route = createFileRoute('/subscriptions/$id')({
  component: SubscriptionDetailPage,
  head: () => ({
    meta: [
      { title: 'Subscription - Aiget Dev' },
      { name: 'description', content: 'View subscription details' },
    ],
  }),
});

function SubscriptionDetailPage() {
  const { id } = Route.useParams();
  const navigate = Route.useNavigate();

  const { data: subscription, isLoading } = useSubscription(id);
  const { data: runsData, isLoading: runsLoading } = useRuns(id);
  const triggerManualRun = useTriggerManualRun();
  const toggleSubscription = useToggleSubscription();
  const deleteSubscription = useDeleteSubscription();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleTriggerRun = () => {
    triggerManualRun.mutate(id);
  };

  const handleToggle = () => {
    if (subscription) {
      toggleSubscription.mutate(id);
    }
  };

  const handleDelete = () => {
    deleteSubscription.mutate(id, {
      onSuccess: () => {
        navigate({ to: '/subscriptions' });
      },
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!subscription) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Link
            to="/subscriptions"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <Icon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" />
            Back to subscriptions
          </Link>
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-medium">Subscription not found</h3>
              <p className="mt-2 text-muted-foreground">
                The subscription you're looking for doesn't exist or has been deleted.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link
              to="/subscriptions"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <Icon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" />
              Back to subscriptions
            </Link>
            <h1 className="text-2xl font-bold">{subscription.name}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={subscription.enabled ? 'default' : 'secondary'}>
                {subscription.enabled ? 'Active' : 'Paused'}
              </Badge>
              <span className="text-sm text-muted-foreground">{subscription.topic}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleTriggerRun}
              disabled={triggerManualRun.isPending}
            >
              <Icon icon={PlayIcon} className="mr-2 h-4 w-4" />
              {triggerManualRun.isPending ? 'Running...' : 'Run Now'}
            </Button>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Icon icon={Delete01Icon} className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{subscription.name}" and all its data. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Subscription Details */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Subscription configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Switch
                  checked={subscription.enabled}
                  onCheckedChange={handleToggle}
                  disabled={toggleSubscription.isPending}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Topic</span>
                <span className="text-sm text-muted-foreground">{subscription.topic}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Schedule</span>
                <span className="text-sm text-muted-foreground">{subscription.cron}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Timezone</span>
                <span className="text-sm text-muted-foreground">{subscription.timezone}</span>
              </div>
              {subscription.interests && subscription.interests.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Interests</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {subscription.interests.map((interest) => (
                      <Badge key={interest} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Subscription activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon icon={Calendar01Icon} className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Created</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(subscription.createdAt).toLocaleDateString()}
                </span>
              </div>
              {subscription.lastRunAt && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon={Clock01Icon} className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Last run</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(subscription.lastRunAt).toLocaleString()}
                  </span>
                </div>
              )}
              {subscription.nextRunAt && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon={Clock01Icon} className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Next run</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(subscription.nextRunAt).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Run History */}
        <Card>
          <CardHeader>
            <CardTitle>Run History</CardTitle>
            <CardDescription>Recent subscription runs</CardDescription>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !runsData?.items.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No runs yet. Click "Run Now" to trigger the first run.
              </p>
            ) : (
              <div className="space-y-2">
                {runsData.items.slice(0, 10).map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          run.status === 'SUCCEEDED'
                            ? 'default'
                            : run.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {run.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(run.scheduledAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {run.result?.itemsDelivered ?? 0} items
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
