/**
 * [PROPS]: 无
 * [EMITS]: logout (click)
 * [POS]: Admin 主布局与导航壳（Better Auth 登出）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Alert01Icon,
  AiBrowserIcon,
  Cancel01Icon,
  CreditCardIcon,
  DashboardSquare01Icon,
  LayersIcon,
  ListTodo,
  Logout01Icon,
  Menu01Icon,
  Receipt,
  UserGroupIcon,
  Flag01Icon,
  News01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@aiget/ui/lib';
import { Icon, type HugeIcon } from '@aiget/ui';
import { useAuthStore } from '@/stores/auth';
import { authClient } from '@/lib/auth-client';

const navItems: { path: string; label: string; icon: HugeIcon }[] = [
  { path: '/', label: 'Dashboard', icon: DashboardSquare01Icon },
  { path: '/users', label: 'Users', icon: UserGroupIcon },
  { path: '/orders', label: 'Orders', icon: Receipt },
  { path: '/subscriptions', label: 'Subscriptions', icon: CreditCardIcon },
  { path: '/jobs', label: 'Jobs', icon: ListTodo },
  { path: '/queues', label: 'Queues', icon: LayersIcon },
  { path: '/errors', label: 'Errors', icon: Alert01Icon },
  { path: '/browser', label: 'Browser Pool', icon: AiBrowserIcon },
  { path: '/digest/topics', label: 'Digest Topics', icon: News01Icon },
  { path: '/digest/reports', label: 'Digest Reports', icon: Flag01Icon },
];

export function MainLayout() {
  const location = useLocation();
  const { user, clearSession } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch {
      // 即使后端调用失败，也要清除前端状态
    }
    clearSession();
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-sidebar transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <span className="text-lg font-bold">Aiget Admin</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <Icon icon={Cancel01Icon} className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    location.pathname === item.path
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <Icon icon={item.icon} className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Icon icon={Menu01Icon} className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-destructive hover:underline"
            >
              <Icon icon={Logout01Icon} className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
