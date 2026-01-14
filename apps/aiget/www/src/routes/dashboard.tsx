/**
 * [POS]: User dashboard page - overview and quick access
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import { Mail01Icon, Notification01Icon, HashtagIcon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardHeader, CardTitle, Icon, Skeleton } from '@aiget/ui';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useInboxStats, useSubscriptions, useUserTopics } from '@/features/digest';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: 'Dashboard - Aiget Dev' },
      { name: 'description', content: 'Your Aiget Dev dashboard' },
    ],
  }),
});

function DashboardPage() {
  const { data: inboxStats, isLoading: inboxLoading } = useInboxStats();
  const { data: subscriptions, isLoading: subscriptionsLoading } = useSubscriptions();
  const { data: topics, isLoading: topicsLoading } = useUserTopics();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your Aiget Dev dashboard</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link to="/inbox">
            <Card className="transition-colors hover:border-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Unread Items</CardTitle>
                <Icon icon={Mail01Icon} className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {inboxLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{inboxStats?.unread ?? 0}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {inboxStats?.total ?? 0} total items
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/subscriptions">
            <Card className="transition-colors hover:border-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
                <Icon icon={Notification01Icon} className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {subscriptionsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{subscriptions?.items.length ?? 0}</div>
                )}
                <p className="text-xs text-muted-foreground">Active subscriptions</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/my-topics">
            <Card className="transition-colors hover:border-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">My Topics</CardTitle>
                <Icon icon={HashtagIcon} className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {topicsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{topics?.items.length ?? 0}</div>
                )}
                <p className="text-xs text-muted-foreground">Published topics</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link to="/subscriptions" className="text-sm text-primary hover:underline">
                Create a new subscription
              </Link>
              <Link to="/inbox" className="text-sm text-primary hover:underline">
                View your inbox
              </Link>
              <Link to="/my-topics" className="text-sm text-primary hover:underline">
                Manage your topics
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
