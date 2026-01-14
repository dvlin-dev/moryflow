/**
 * [POS]: User settings page
 */
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@aiget/ui';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/lib/auth-context';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: 'Settings - Aiget Dev' }, { name: 'description', content: 'Account settings' }],
  }),
});

function SettingsPage() {
  const { user, signOut } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm">{user?.name || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Developer Tools</CardTitle>
            <CardDescription>Access API keys and developer features</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <a href="https://console.aiget.dev" target="_blank" rel="noopener noreferrer">
                Open Developer Console
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>Sign Out</CardTitle>
            <CardDescription>Sign out of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={signOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
