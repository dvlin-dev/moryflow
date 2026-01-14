/**
 * [PROPS]: children
 * [POS]: Dashboard layout with sidebar navigation for authenticated users
 */

import { Link, useLocation } from '@tanstack/react-router';
import {
  Home01Icon,
  Mail01Icon,
  Notification01Icon,
  HashtagIcon,
  Settings01Icon,
  Logout01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@aiget/ui/lib';
import { Icon, Button, Skeleton } from '@aiget/ui';
import { useAuth } from '@/lib/auth-context';
import { Header, Footer } from './index';

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home01Icon;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home01Icon },
  { label: 'Inbox', href: '/inbox', icon: Mail01Icon },
  { label: 'Subscriptions', href: '/subscriptions', icon: Notification01Icon },
  { label: 'My Topics', href: '/my-topics', icon: HashtagIcon },
  { label: 'Settings', href: '/settings', icon: Settings01Icon },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading, signOut } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <aside className="hidden w-64 border-r bg-muted/30 lg:block">
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </aside>
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-64 w-full" />
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    // Redirect to login
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
    }
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden w-64 border-r bg-muted/30 lg:block">
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon icon={item.icon} className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="mt-auto border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={signOut}
            >
              <Icon icon={Logout01Icon} className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container max-w-5xl py-6">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
