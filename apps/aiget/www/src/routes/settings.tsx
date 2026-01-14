/**
 * [POS]: User settings page
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Icon } from '@aiget/ui';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { Header, Footer } from '@/components/layout';
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-12">
          {/* Back link */}
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Icon icon={ArrowLeft02Icon} className="size-4" />
            Back to Home
          </Link>

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
        </div>
      </main>
      <Footer />
    </div>
  );
}
