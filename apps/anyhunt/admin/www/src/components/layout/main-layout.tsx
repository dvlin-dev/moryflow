/**
 * [PROPS]: 无
 * [EMITS]: logout (click)
 * [POS]: Admin 主布局与导航壳（Better Auth 登出）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Alert01Icon,
  AiBrowserIcon,
  AiBrain02Icon,
  ArrowDown01Icon,
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
  Edit01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@anyhunt/ui/lib';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Icon,
  type HugeIcon,
} from '@anyhunt/ui';
import { useAuthStore } from '@/stores/auth';
import { authClient } from '@/lib/auth-client';

type NavItem = { path: string; label: string; icon: HugeIcon };
type NavGroup = { id: string; label: string; icon: HugeIcon; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: DashboardSquare01Icon,
    items: [{ path: '/', label: 'Dashboard', icon: DashboardSquare01Icon }],
  },
  {
    id: 'users-billing',
    label: 'Users & Billing',
    icon: UserGroupIcon,
    items: [
      { path: '/users', label: 'Users', icon: UserGroupIcon },
      { path: '/orders', label: 'Orders', icon: Receipt },
      { path: '/subscriptions', label: 'Subscriptions', icon: CreditCardIcon },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: LayersIcon,
    items: [
      { path: '/jobs', label: 'Jobs', icon: ListTodo },
      { path: '/queues', label: 'Queues', icon: LayersIcon },
      { path: '/browser', label: 'Browser Pool', icon: AiBrowserIcon },
      { path: '/errors', label: 'Errors', icon: Alert01Icon },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    icon: AiBrain02Icon,
    items: [{ path: '/llm', label: 'LLM', icon: AiBrain02Icon }],
  },
  {
    id: 'digest',
    label: 'Digest',
    icon: News01Icon,
    items: [
      { path: '/digest/topics', label: 'Topics', icon: News01Icon },
      { path: '/digest/reports', label: 'Reports', icon: Flag01Icon },
      { path: '/digest/welcome', label: 'Welcome', icon: Edit01Icon },
    ],
  },
];

function isPathActive(pathname: string, itemPath: string): boolean {
  if (itemPath === '/') return pathname === '/';
  if (pathname === itemPath) return true;
  return pathname.startsWith(`${itemPath}/`);
}

export function MainLayout() {
  const location = useLocation();
  const { user, clearSession } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const pathname = location.pathname;
    const initial: Record<string, boolean> = {};
    for (const group of navGroups) {
      initial[group.id] = group.items.some((item) => isPathActive(pathname, item.path));
    }
    return initial;
  });

  useEffect(() => {
    const pathname = location.pathname;
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const group of navGroups) {
        if (group.items.some((item) => isPathActive(pathname, item.path))) {
          next[group.id] = true;
        }
      }
      return next;
    });
  }, [location.pathname]);

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
          <span className="text-lg font-bold">Anyhunt Admin</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <Icon icon={Cancel01Icon} className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {navGroups.map((group) => {
              const groupActive = group.items.some((item) =>
                isPathActive(location.pathname, item.path)
              );
              const open = openGroups[group.id] ?? false;

              return (
                <li key={group.id} className="pt-1">
                  <Collapsible
                    open={open}
                    onOpenChange={(next) =>
                      setOpenGroups((prev) => ({ ...prev, [group.id]: next }))
                    }
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                          groupActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                        type="button"
                      >
                        <span className="flex items-center gap-3">
                          <Icon icon={group.icon} className="h-4 w-4" />
                          {group.label}
                        </span>
                        <Icon
                          icon={ArrowDown01Icon}
                          className={cn(
                            'h-4 w-4 transition-transform',
                            open ? 'rotate-0' : '-rotate-90'
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <ul className="mt-1 space-y-1 pl-3">
                        {group.items.map((item) => {
                          const active = isPathActive(location.pathname, item.path);
                          return (
                            <li key={item.path}>
                              <Link
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                                  active
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                                )}
                              >
                                <Icon icon={item.icon} className="h-4 w-4 opacity-80" />
                                {item.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              );
            })}
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
